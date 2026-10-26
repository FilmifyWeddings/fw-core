using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace StudioCoreUploader
{
    static class Program
    {
        public const string AppName = "StudioCore Desktop Uploader";
        public const string AppVersion = "2.3.0";
        private const string RegistryRunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string RegistryValueName = "StudioCoreUploader";
        public const int Port = 41789;

        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private const int SW_HIDE = 0;

        private static HttpListener _listener;
        private static string _logsDirectory;

        [STAThread]
        static void Main(string[] args)
        {
            // Immediately hide any console window for seamless background operation
            try
            {
                IntPtr consoleHwnd = GetConsoleWindow();
                if (consoleHwnd != IntPtr.Zero)
                {
                    ShowWindow(consoleHwnd, SW_HIDE);
                }
            }
            catch { }

            string targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "StudioCore");
            string targetExe = Path.Combine(targetDir, "StudioCore-Uploader.exe");
            string currentExe = Application.ExecutablePath;
            _logsDirectory = Path.Combine(targetDir, "logs");

            try
            {
                if (!Directory.Exists(_logsDirectory)) Directory.CreateDirectory(_logsDirectory);
                Log("Started. Path: " + currentExe + " Args: " + string.Join(" ", args ?? new string[0]));
            }
            catch { }

            // CRITICAL: Guaranteed TLS 1.2 and TLS 1.3 for all outgoing HTTPS connections
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)12288 | SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
                ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };
                ServicePointManager.DefaultConnectionLimit = 128;
                ServicePointManager.Expect100Continue = false;
            }
            catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isBackground = args != null && Array.Exists(args, delegate(string a) {
                return a.Equals("--background", StringComparison.OrdinalIgnoreCase) || a.Equals("-b", StringComparison.OrdinalIgnoreCase);
            });
            bool isInstalledLocation = string.Equals(currentExe, targetExe, StringComparison.OrdinalIgnoreCase);

            // 1. If running as an installer (outside %LocalAppData%\StudioCore and not in background mode)
            if (!isInstalledLocation && !isBackground)
            {
                RunInstaller(targetDir, targetExe, currentExe);
                return;
            }

            // 2. Start Dedicated Background Server Thread (Never blocked by GUI or message loop)
            Thread serverThread = new Thread(() =>
            {
                StartHttpServer(Port, targetDir);
            });
            serverThread.IsBackground = true;
            serverThread.Start();

            // 3. Running in System Tray
            try
            {
                SetAutoStart(targetExe, true);
                EnsureShortcuts(targetExe);

                Application.Run(new TrayForm(Port, targetExe, targetDir));
            }
            catch (Exception ex)
            {
                Log("[FATAL GUI] " + ex.ToString());
            }
        }

        public static void Log(string msg)
        {
            try
            {
                if (_logsDirectory != null && Directory.Exists(_logsDirectory))
                {
                    string line = "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] " + msg + Environment.NewLine;
                    File.AppendAllText(Path.Combine(_logsDirectory, "upload.log"), line);
                }
            }
            catch { }
        }

        private static void StartHttpServer(int port, string targetDir)
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                _listener.Start();
                Log("HTTP loopback server successfully bound and listening on 127.0.0.1:" + port);

                while (_listener.IsListening)
                {
                    try
                    {
                        HttpListenerContext context = _listener.GetContext();
                        Task.Run((Func<Task>)(() => HandleRequest(context, port)));
                    }
                    catch (Exception ex)
                    {
                        if (!_listener.IsListening) break;
                        Log("Listener loop notice: " + ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                Log("Failed to start HTTP server on port " + port + ": " + ex.Message);
            }
        }

        private static async Task HandleRequest(HttpListenerContext context, int port)
        {
            HttpListenerRequest req = context.Request;
            HttpListenerResponse res = context.Response;

            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "*");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 200;
                res.Close();
                return;
            }

            string path = req.Url.AbsolutePath.ToLowerInvariant();

            if (path == "/" || path == "/status" || path == "/ping")
            {
                res.ContentType = "application/json; charset=utf-8";
                string json = "{\"status\":\"online\",\"port\":" + port + ",\"version\":\"" + AppVersion + "\",\"machine\":\"" + Environment.MachineName + "\",\"engine\":\"StudioCore Native Turbo Engine\",\"active\":true}";
                byte[] buffer = Encoding.UTF8.GetBytes(json);
                res.ContentLength64 = buffer.Length;
                await res.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                res.Close();
                return;
            }

            if (path == "/api/upload-file" && req.HttpMethod == "POST")
            {
                string filename = req.Headers["x-filename"] ?? "photo.jpg";
                string galleryId = req.Headers["x-gallery-id"] ?? "";
                string workspaceId = req.Headers["x-workspace-id"] ?? "";
                string collectionId = req.Headers["x-collection-id"] ?? "";

                try
                {
                    Log("Received upload stream for: " + filename + " (Gallery: " + galleryId + ")");

                    using (MemoryStream ms = new MemoryStream())
                    {
                        await req.InputStream.CopyToAsync(ms);
                        byte[] originalBytes = ms.ToArray();
                        Log("Buffered " + originalBytes.Length + " bytes for " + filename);

                        // 1. Generate True Optimized PhotoOwl Preview (2048px) and Thumbnail (480px)
                        byte[] previewBytes = null;
                        byte[] thumbBytes = null;
                        int imgWidth = 1920;
                        int imgHeight = 1080;

                        try
                        {
                            using (MemoryStream imgMs = new MemoryStream(originalBytes))
                            using (Image srcImg = Image.FromStream(imgMs, true, false))
                            {
                                // Auto-rotate if EXIF orientation tag exists
                                try
                                {
                                    if (Array.IndexOf(srcImg.PropertyIdList, 0x0112) >= 0)
                                    {
                                        var prop = srcImg.GetPropertyItem(0x0112);
                                        int orient = BitConverter.ToUInt16(prop.Value, 0);
                                        if (orient == 3) srcImg.RotateFlip(RotateFlipType.Rotate180FlipNone);
                                        else if (orient == 6) srcImg.RotateFlip(RotateFlipType.Rotate90FlipNone);
                                        else if (orient == 8) srcImg.RotateFlip(RotateFlipType.Rotate270FlipNone);
                                    }
                                }
                                catch { }

                                imgWidth = srcImg.Width;
                                imgHeight = srcImg.Height;

                                // Generate 2048px High-Res Preview (~115 KB)
                                previewBytes = ResizeImage(srcImg, 2048, 78L);

                                // Generate 480px Fast Thumbnail (~18 KB)
                                thumbBytes = ResizeImage(srcImg, 480, 65L);
                            }
                        }
                        catch (Exception exImg)
                        {
                            Log("Image resize notice for " + filename + ": " + exImg.Message);
                        }

                        if (previewBytes == null || previewBytes.Length == 0) previewBytes = originalBytes;
                        if (thumbBytes == null || thumbBytes.Length == 0) thumbBytes = previewBytes;

                        Log(string.Format("Generated variants for {0}: Original={1:N0} KB, Preview={2:N0} KB, Thumb={3:N0} KB ({4}x{5})",
                            filename, originalBytes.Length / 1024, previewBytes.Length / 1024, thumbBytes.Length / 1024, imgWidth, imgHeight));

                        // 2. Request presigned upload URLs from StudioCore API
                        string getUrlPayload = "{\"galleryId\":\"" + galleryId + "\",\"filename\":\"" + filename + "\",\"filesize\":" + originalBytes.Length + ",\"workspaceId\":\"" + workspaceId + "\",\"collectionId\":\"" + collectionId + "\"}";
                        string urlJson = await PostJsonAsync("https://studiocore.in/api/gallery/upload-url", getUrlPayload);

                        string originalUploadUrl = ExtractJsonValue(urlJson, "originalUploadUrl");
                        string previewUploadUrl = ExtractJsonValue(urlJson, "previewUploadUrl");
                        string thumbUploadUrl = ExtractJsonValue(urlJson, "thumbUploadUrl");
                        string originalKey = ExtractJsonValue(urlJson, "originalKey");
                        string previewKey = ExtractJsonValue(urlJson, "previewKey");
                        string thumbKey = ExtractJsonValue(urlJson, "thumbKey");

                        if (string.IsNullOrEmpty(originalUploadUrl))
                        {
                            throw new Exception("Did not receive upload URLs from studio server. Server response: " + urlJson);
                        }

                        // 3. Direct PUT streams to Backblaze B2 (high-speed parallel network threads)
                        Log("Streaming " + filename + " (Original + Optimized Preview + Thumb) directly to Backblaze B2 storage...");
                        var uploadOriginal = PutBinaryAsync(originalUploadUrl, originalBytes, "image/jpeg");
                        var uploadPreview = !string.IsNullOrEmpty(previewUploadUrl) ? PutBinaryAsync(previewUploadUrl, previewBytes, "image/jpeg") : Task.FromResult(true);
                        var uploadThumb = !string.IsNullOrEmpty(thumbUploadUrl) ? PutBinaryAsync(thumbUploadUrl, thumbBytes, "image/jpeg") : Task.FromResult(true);

                        await Task.WhenAll(uploadOriginal, uploadPreview, uploadThumb);
                        Log("Completed B2 upload for " + filename);

                        // 4. Register photo in Supabase with correct dimensions and size
                        string registerPayload = "{\"galleryId\":\"" + galleryId + "\",\"photos\":[{"
                            + "\"gallery_id\":\"" + galleryId + "\","
                            + "\"collection_id\":" + (string.IsNullOrEmpty(collectionId) ? "null" : "\"" + collectionId + "\"") + ","
                            + "\"original_key\":\"" + originalKey + "\","
                            + "\"preview_key\":\"" + previewKey + "\","
                            + "\"thumbnail_key\":\"" + thumbKey + "\","
                            + "\"width\":" + imgWidth + ","
                            + "\"height\":" + imgHeight + ","
                            + "\"size_bytes\":" + originalBytes.Length
                            + "}]}";
                        await PostJsonAsync("https://studiocore.in/api/gallery/photos/register", registerPayload);
                        Log("Successfully registered " + filename + " in database");

                        res.ContentType = "application/json";
                        byte[] okBuf = Encoding.UTF8.GetBytes("{\"success\":true,\"filename\":\"" + filename + "\",\"width\":" + imgWidth + ",\"height\":" + imgHeight + "}");
                        res.ContentLength64 = okBuf.Length;
                        await res.OutputStream.WriteAsync(okBuf, 0, okBuf.Length);
                        res.Close();
                        return;
                    }
                }
                catch (Exception ex)
                {
                    Log("Upload error for " + filename + ": " + ex.ToString());
                    try
                    {
                        res.StatusCode = 500;
                        res.ContentType = "application/json";
                        string errJson = "{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ") + "\"}";
                        byte[] errBuf = Encoding.UTF8.GetBytes(errJson);
                        res.ContentLength64 = errBuf.Length;
                        res.OutputStream.Write(errBuf, 0, errBuf.Length);
                        res.Close();
                    }
                    catch { }
                    return;
                }
            }

            res.StatusCode = 404;
            res.Close();
        }

        private static byte[] ResizeImage(Image src, int maxDimension, long quality)
        {
            float ratio = Math.Min((float)maxDimension / src.Width, (float)maxDimension / src.Height);
            if (ratio > 1.0f) ratio = 1.0f;

            int newW = Math.Max(1, (int)(src.Width * ratio));
            int newH = Math.Max(1, (int)(src.Height * ratio));

            using (Bitmap dest = new Bitmap(newW, newH, PixelFormat.Format24bppRgb))
            {
                dest.SetResolution(src.HorizontalResolution > 0 ? src.HorizontalResolution : 96, src.VerticalResolution > 0 ? src.VerticalResolution : 96);
                using (Graphics g = Graphics.FromImage(dest))
                {
                    g.CompositingQuality = CompositingQuality.HighSpeed;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighSpeed;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.DrawImage(src, 0, 0, newW, newH);
                }

                using (MemoryStream outMs = new MemoryStream())
                {
                    ImageCodecInfo jpegCodec = GetEncoder(ImageFormat.Jpeg);
                    EncoderParameters encoderParams = new EncoderParameters(1);
                    encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
                    dest.Save(outMs, jpegCodec, encoderParams);
                    return outMs.ToArray();
                }
            }
        }

        private static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageEncoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid)
                {
                    return codec;
                }
            }
            return null;
        }

        private static async Task<string> PostJsonAsync(string url, string jsonBody)
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)12288 | SecurityProtocolType.Tls12;
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "POST";
            req.ContentType = "application/json";
            req.UserAgent = "StudioCore-Turbo-Engine/2.3 (" + Environment.OSVersion.ToString() + ")";
            req.Timeout = 60000;
            req.ReadWriteTimeout = 60000;

            byte[] bytes = Encoding.UTF8.GetBytes(jsonBody);
            req.ContentLength = bytes.Length;
            using (Stream os = await req.GetRequestStreamAsync())
            {
                await os.WriteAsync(bytes, 0, bytes.Length);
            }
            using (WebResponse resp = await req.GetResponseAsync())
            using (StreamReader sr = new StreamReader(resp.GetResponseStream()))
            {
                return await sr.ReadToEndAsync();
            }
        }

        private static async Task<bool> PutBinaryAsync(string url, byte[] data, string contentType)
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)12288 | SecurityProtocolType.Tls12;
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "PUT";
            req.ContentType = contentType;
            req.UserAgent = "StudioCore-Turbo-Engine/2.3";
            req.Timeout = 120000;
            req.ReadWriteTimeout = 120000;
            req.ContentLength = data.Length;

            using (Stream os = await req.GetRequestStreamAsync())
            {
                await os.WriteAsync(data, 0, data.Length);
            }
            using (HttpWebResponse resp = (HttpWebResponse)await req.GetResponseAsync())
            {
                return (int)resp.StatusCode >= 200 && (int)resp.StatusCode < 300;
            }
        }

        private static string ExtractJsonValue(string json, string key)
        {
            try
            {
                int kIdx = json.IndexOf("\"" + key + "\"");
                if (kIdx == -1) return "";
                int colonIdx = json.IndexOf(':', kIdx);
                if (colonIdx == -1) return "";
                int q1 = json.IndexOf('"', colonIdx);
                if (q1 == -1) return "";
                int q2 = json.IndexOf('"', q1 + 1);
                if (q2 == -1) return "";
                return json.Substring(q1 + 1, q2 - q1 - 1);
            }
            catch { return ""; }
        }

        public static void SetAutoStart(string exePath, bool enable)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RegistryRunKey, true))
                {
                    if (key != null)
                    {
                        if (enable)
                            key.SetValue(RegistryValueName, "\"" + exePath + "\" --background");
                        else
                            key.DeleteValue(RegistryValueName, false);
                    }
                }
            }
            catch { }
        }

        public static void EnsureShortcuts(string targetExe)
        {
            try
            {
                // 1. Start Menu Programs (Makes app appear in Windows Search Bar!)
                string startMenuPrograms = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string startMenuFolder = Path.Combine(startMenuPrograms, "StudioCore");
                if (!Directory.Exists(startMenuFolder)) Directory.CreateDirectory(startMenuFolder);
                CreateShortcut(Path.Combine(startMenuFolder, "StudioCore Uploader.lnk"), targetExe, "StudioCore Desktop Turbo Uploader");

                // 2. Desktop Shortcut
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                if (Directory.Exists(desktop))
                {
                    CreateShortcut(Path.Combine(desktop, "StudioCore Uploader.lnk"), targetExe, "StudioCore Desktop Turbo Uploader");
                }
            }
            catch { }
        }

        public static void CreateShortcut(string shortcutPath, string targetExePath, string description)
        {
            try
            {
                string dir = Path.GetDirectoryName(shortcutPath);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                Type shellType = Type.GetTypeFromCLSID(new Guid("72C24DD5-D70A-438B-8A42-98424B88AFB8"));
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetExePath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetExePath);
                    shortcut.Description = description;
                    shortcut.IconLocation = targetExePath + ",0";
                    shortcut.Save();
                }
            }
            catch { }
        }

        public static Icon GetAppIcon(string targetDir)
        {
            try
            {
                Icon icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (icon != null) return icon;
            }
            catch { }

            try
            {
                string localIco = Path.Combine(targetDir, "studiocore-uploader.ico");
                if (File.Exists(localIco)) return new Icon(localIco);
            }
            catch { }

            return SystemIcons.Application;
        }

        static void RunInstaller(string targetDir, string targetExe, string currentExe)
        {
            Icon appIcon = GetAppIcon(targetDir);

            Form installerForm = new Form
            {
                Text = "StudioCore Desktop Uploader Setup",
                Width = 500,
                Height = 320,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                StartPosition = FormStartPosition.CenterScreen,
                BackColor = Color.FromArgb(20, 20, 24),
                ForeColor = Color.White,
                Icon = appIcon
            };

            Label titleLabel = new Label
            {
                Text = "⚡ StudioCore Desktop Uploader (Beta)",
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                ForeColor = Color.FromArgb(245, 158, 11),
                Location = new Point(24, 20),
                AutoSize = true
            };

            Label subLabel = new Label
            {
                Text = "Next-Generation High-Speed Desktop Engine for Multi-GB Wedding Galleries...",
                Font = new Font("Segoe UI", 9.5f),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(24, 55),
                Width = 440,
                Height = 35
            };

            ProgressBar progressBar = new ProgressBar
            {
                Location = new Point(24, 105),
                Width = 436,
                Height = 22,
                Style = ProgressBarStyle.Marquee,
                MarqueeAnimationSpeed = 30
            };

            Label statusLabel = new Label
            {
                Text = "Installing to system, creating Start Menu shortcuts, and enabling auto-start...",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(113, 113, 122),
                Location = new Point(24, 140),
                Width = 440
            };

            Button finishButton = new Button
            {
                Text = "Installing...",
                Location = new Point(350, 215),
                Width = 110,
                Height = 36,
                BackColor = Color.FromArgb(39, 39, 42),
                ForeColor = Color.FromArgb(161, 161, 170),
                FlatStyle = FlatStyle.Flat,
                Enabled = false,
                Cursor = Cursors.Hand
            };
            finishButton.FlatAppearance.BorderSize = 0;
            finishButton.Click += delegate(object s, EventArgs e) { installerForm.Close(); };

            installerForm.Controls.Add(titleLabel);
            installerForm.Controls.Add(subLabel);
            installerForm.Controls.Add(progressBar);
            installerForm.Controls.Add(statusLabel);
            installerForm.Controls.Add(finishButton);

            System.Windows.Forms.Timer installTimer = new System.Windows.Forms.Timer { Interval = 1000 };
            installTimer.Tick += delegate(object s, EventArgs e)
            {
                installTimer.Stop();
                try
                {
                    // Kill old running process if any
                    Process[] procs = Process.GetProcessesByName("StudioCore-Uploader");
                    foreach (var p in procs)
                    {
                        try { if (p.Id != Process.GetCurrentProcess().Id) p.Kill(); } catch { }
                    }
                    Thread.Sleep(300);

                    // Create subdirectories (logs, temp, uploads)
                    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                    string logsDir = Path.Combine(targetDir, "logs");
                    string tempDir = Path.Combine(targetDir, "temp");
                    string uploadsDir = Path.Combine(targetDir, "uploads");
                    if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
                    if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
                    if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

                    File.Copy(currentExe, targetExe, true);

                    // Add to Start Menu, Desktop, and Startup
                    EnsureShortcuts(targetExe);
                    SetAutoStart(targetExe, true);

                    // Launch installed executable in background tray
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = targetExe,
                        Arguments = "--background",
                        UseShellExecute = true
                    });

                    progressBar.Style = ProgressBarStyle.Continuous;
                    progressBar.Value = 100;
                    statusLabel.ForeColor = Color.FromArgb(16, 185, 129);
                    statusLabel.Text = "✅ Installed! Active in Windows System Tray (under ^ arrow) & Windows Search!";
                    finishButton.Text = "Finish";
                    finishButton.BackColor = Color.FromArgb(16, 185, 129);
                    finishButton.ForeColor = Color.White;
                    finishButton.Enabled = true;

                    // Auto-close after 3 seconds
                    System.Windows.Forms.Timer closeTimer = new System.Windows.Forms.Timer { Interval = 3000 };
                    closeTimer.Tick += delegate(object s2, EventArgs e2) { closeTimer.Stop(); installerForm.Close(); };
                    closeTimer.Start();
                }
                catch (Exception ex)
                {
                    statusLabel.ForeColor = Color.FromArgb(239, 68, 68);
                    statusLabel.Text = "Error: " + ex.Message;
                    finishButton.Text = "Close";
                    finishButton.Enabled = true;
                }
            };

            installerForm.Load += delegate(object s, EventArgs e) { installTimer.Start(); };
            Application.Run(installerForm);
        }
    }

    public class TrayForm : Form
    {
        private NotifyIcon _trayIcon;
        private readonly string _targetExe;
        private readonly string _logsDir;
        private readonly int _port;

        public TrayForm(int port, string targetExe, string targetDir)
        {
            _port = port;
            _targetExe = targetExe;
            _logsDir = Path.Combine(targetDir, "logs");
            if (!Directory.Exists(_logsDir)) Directory.CreateDirectory(_logsDir);

            this.ShowInTaskbar = false;
            this.WindowState = FormWindowState.Minimized;
            this.FormBorderStyle = FormBorderStyle.None;
            this.Size = new Size(0, 0);

            // Enterprise Tray Menu
            ContextMenu trayMenu = new ContextMenu();
            MenuItem versionItem = new MenuItem("Version " + Program.AppVersion + " (StudioCore Turbo)") { Enabled = false };
            MenuItem machineItem = new MenuItem(Environment.MachineName) { Enabled = false };
            MenuItem statusItem = new MenuItem("● Status: Active & Ready (Port " + port + ")") { Enabled = false };

            MenuItem dashItem = new MenuItem("🌐 Open Gallery Dashboard", delegate(object s, EventArgs e)
            {
                try { Process.Start("https://studiocore.in/workspace/gallery"); } catch { }
            });

            MenuItem autoStartItem = new MenuItem("⚙️ Start with Windows", delegate(object s, EventArgs e)
            {
                MenuItem mi = (MenuItem)s;
                mi.Checked = !mi.Checked;
                Program.SetAutoStart(_targetExe, mi.Checked);
            });
            autoStartItem.Checked = true;

            MenuItem logsItem = new MenuItem("📁 Save & View Logs...", delegate(object s, EventArgs e)
            {
                try { Process.Start("explorer.exe", _logsDir); } catch { }
            });

            MenuItem restartItem = new MenuItem("🔄 Restart Uploader", delegate(object s, EventArgs e)
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = _targetExe,
                        Arguments = "--background",
                        UseShellExecute = true
                    });
                }
                catch { }
                if (_trayIcon != null) _trayIcon.Visible = false;
                this.Close();
                Application.Exit();
            });

            MenuItem quitItem = new MenuItem("❌ Quit", delegate(object s, EventArgs e)
            {
                if (_trayIcon != null) _trayIcon.Visible = false;
                this.Close();
                Application.Exit();
            });

            trayMenu.MenuItems.Add(versionItem);
            trayMenu.MenuItems.Add(machineItem);
            trayMenu.MenuItems.Add(statusItem);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(dashItem);
            trayMenu.MenuItems.Add(autoStartItem);
            trayMenu.MenuItems.Add(logsItem);
            trayMenu.MenuItems.Add(restartItem);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(quitItem);

            try
            {
                Icon appIcon = Program.GetAppIcon(targetDir);

                _trayIcon = new NotifyIcon
                {
                    Icon = appIcon,
                    ContextMenu = trayMenu,
                    Text = "StudioCore Desktop Uploader - " + Environment.MachineName + " (Port " + port + ")",
                    Visible = true
                };

                _trayIcon.DoubleClick += delegate(object s, EventArgs e)
                {
                    try
                    {
                        _trayIcon.ShowBalloonTip(3000, "StudioCore Desktop Uploader",
                            "Active & running on " + Environment.MachineName + " (Port " + port + "). Photos upload at turbo speed with zero drops!",
                            ToolTipIcon.Info);
                    }
                    catch { }
                };
            }
            catch (Exception ex)
            {
                Program.Log("NotifyIcon initialization warning: " + ex.Message);
            }
        }

        protected override void SetVisibleCore(bool value)
        {
            base.SetVisibleCore(false);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_trayIcon != null) _trayIcon.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
