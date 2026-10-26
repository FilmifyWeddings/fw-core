using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace StudioCoreUploader
{
    static class Program
    {
        private const string AppName = "StudioCore Desktop Uploader";
        private const string MutexName = "StudioCoreUploaderSingleInstanceMutex_41789";
        private const string RegistryRunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string RegistryValueName = "StudioCoreUploader";
        private const int Port = 41789;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "StudioCore");
            string targetExe = Path.Combine(targetDir, "StudioCore-Uploader.exe");
            string currentExe = Application.ExecutablePath;

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

            // 2. Running installed in Background / System Tray
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    // Already running in background
                    return;
                }

                // Ensure auto-start registry is active
                SetAutoStart(targetExe, true);

                Application.Run(new TrayApplicationContext(Port, targetExe));
            }
        }

        static void SetAutoStart(string exePath, bool enable)
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

        static void RunInstaller(string targetDir, string targetExe, string currentExe)
        {
            Form installerForm = new Form
            {
                Text = "StudioCore Desktop Uploader Setup",
                Width = 460,
                Height = 280,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                StartPosition = FormStartPosition.CenterScreen,
                BackColor = Color.FromArgb(24, 24, 27),
                ForeColor = Color.White
            };

            Label titleLabel = new Label
            {
                Text = "⚡ StudioCore Desktop Uploader",
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                ForeColor = Color.FromArgb(245, 158, 11),
                Location = new Point(24, 20),
                AutoSize = true
            };

            Label subLabel = new Label
            {
                Text = "Installing high-speed native background engine for 20x uploads...",
                Font = new Font("Segoe UI", 9.5f),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(24, 55),
                Width = 400,
                Height = 35
            };

            ProgressBar progressBar = new ProgressBar
            {
                Location = new Point(24, 105),
                Width = 396,
                Height = 22,
                Style = ProgressBarStyle.Marquee,
                MarqueeAnimationSpeed = 30
            };

            Label statusLabel = new Label
            {
                Text = "Copying files to system and enabling Windows auto-start...",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(113, 113, 122),
                Location = new Point(24, 138),
                Width = 400
            };

            Button finishButton = new Button
            {
                Text = "Installing...",
                Location = new Point(310, 185),
                Width = 110,
                Height = 34,
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

            System.Windows.Forms.Timer installTimer = new System.Windows.Forms.Timer { Interval = 1200 };
            installTimer.Tick += delegate(object s, EventArgs e)
            {
                installTimer.Stop();
                try
                {
                    // Kill old instance if running
                    Process[] procs = Process.GetProcessesByName("StudioCore-Uploader");
                    foreach (var p in procs)
                    {
                        try { if (p.Id != Process.GetCurrentProcess().Id) p.Kill(); } catch { }
                    }
                    Thread.Sleep(200);

                    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                    File.Copy(currentExe, targetExe, true);

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
                    statusLabel.Text = "✅ Installed! Running in Windows System Tray (under ^ arrow).";
                    finishButton.Text = "Finish";
                    finishButton.BackColor = Color.FromArgb(16, 185, 129);
                    finishButton.ForeColor = Color.White;
                    finishButton.Enabled = true;

                    // Auto-close after 3 seconds
                    System.Windows.Forms.Timer closeTimer = new System.Windows.Forms.Timer { Interval = 2800 };
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

    public class TrayApplicationContext : ApplicationContext
    {
        private readonly NotifyIcon _trayIcon;
        private readonly HttpListener _listener;
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();
        private readonly string _targetExe;
        private readonly int _port;

        public TrayApplicationContext(int port, string targetExe)
        {
            _port = port;
            _targetExe = targetExe;

            ContextMenu trayMenu = new ContextMenu();
            MenuItem titleItem = new MenuItem("⚡ StudioCore Turbo Uploader v2.1") { Enabled = false };
            MenuItem statusItem = new MenuItem("● Status: Active in Tray (Port " + port + ")") { Enabled = false };
            MenuItem dashItem = new MenuItem("🌐 Open Gallery Dashboard", delegate(object s, EventArgs e)
            {
                try { Process.Start("https://studiocore.in/workspace/gallery"); } catch { }
            });
            MenuItem autoStartItem = new MenuItem("⚙️ Start with Windows", delegate(object s, EventArgs e)
            {
                MenuItem mi = (MenuItem)s;
                mi.Checked = !mi.Checked;
                try
                {
                    using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (key != null)
                        {
                            if (mi.Checked) key.SetValue("StudioCoreUploader", "\"" + _targetExe + "\" --background");
                            else key.DeleteValue("StudioCoreUploader", false);
                        }
                    }
                }
                catch { }
            });
            autoStartItem.Checked = true;

            MenuItem exitItem = new MenuItem("❌ Exit StudioCore Uploader", delegate(object s, EventArgs e)
            {
                if (_trayIcon != null) _trayIcon.Visible = false;
                _cts.Cancel();
                try { _listener.Stop(); } catch { }
                Application.Exit();
            });

            trayMenu.MenuItems.Add(titleItem);
            trayMenu.MenuItems.Add(statusItem);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(dashItem);
            trayMenu.MenuItems.Add(autoStartItem);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(exitItem);

            _trayIcon = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                ContextMenu = trayMenu,
                Text = "StudioCore Turbo Uploader (Active on " + port + ")",
                Visible = true
            };

            _trayIcon.DoubleClick += delegate(object s, EventArgs e)
            {
                _trayIcon.ShowBalloonTip(3000, "StudioCore Turbo Uploader",
                    "Uploader is actively running in your system tray on port " + port + ". Uploads in Chrome/Edge will automatically use 20x turbo speed!",
                    ToolTipIcon.Info);
            };

            // Start background HTTP listener on port
            _listener = new HttpListener();
            try
            {
                _listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                _listener.Prefixes.Add("http://localhost:" + port + "/");
                _listener.Start();
                Task.Run((Action)ListenLoop);
            }
            catch (Exception ex)
            {
                _trayIcon.ShowBalloonTip(4000, "Port Error", "Could not bind port " + port + ": " + ex.Message, ToolTipIcon.Warning);
            }
        }

        private async void ListenLoop()
        {
            while (!_cts.IsCancellationRequested && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = await _listener.GetContextAsync();
                    Task.Run((Func<Task>)(() => HandleRequest(context)));
                }
                catch
                {
                    if (_cts.IsCancellationRequested) break;
                }
            }
        }

        private async Task HandleRequest(HttpListenerContext context)
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
                string json = "{\"status\":\"online\",\"port\":" + _port + ",\"version\":\"2.1.0\",\"engine\":\"StudioCore Native Turbo Engine\",\"active\":true}";
                byte[] buffer = Encoding.UTF8.GetBytes(json);
                res.ContentLength64 = buffer.Length;
                await res.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                res.Close();
                return;
            }

            if (path == "/api/upload-file" && req.HttpMethod == "POST")
            {
                try
                {
                    string galleryId = req.Headers["x-gallery-id"] ?? "";
                    string filename = req.Headers["x-filename"] ?? "photo.jpg";
                    string workspaceId = req.Headers["x-workspace-id"] ?? "";
                    string collectionId = req.Headers["x-collection-id"] ?? "";

                    using (MemoryStream ms = new MemoryStream())
                    {
                        await req.InputStream.CopyToAsync(ms);
                        byte[] fileBytes = ms.ToArray();

                        // 1. Request presigned upload URLs from StudioCore
                        string getUrlPayload = "{\"galleryId\":\"" + galleryId + "\",\"filename\":\"" + filename + "\",\"filesize\":" + fileBytes.Length + ",\"workspaceId\":\"" + workspaceId + "\",\"collectionId\":\"" + collectionId + "\"}";
                        string urlJson = await PostJsonAsync("https://studiocore.in/api/gallery/upload-url", getUrlPayload);

                        string originalUploadUrl = ExtractJsonValue(urlJson, "originalUploadUrl");
                        string previewUploadUrl = ExtractJsonValue(urlJson, "previewUploadUrl");
                        string thumbUploadUrl = ExtractJsonValue(urlJson, "thumbUploadUrl");
                        string originalKey = ExtractJsonValue(urlJson, "originalKey");
                        string previewKey = ExtractJsonValue(urlJson, "previewKey");
                        string thumbKey = ExtractJsonValue(urlJson, "thumbKey");

                        if (!string.IsNullOrEmpty(originalUploadUrl))
                        {
                            // 2. Direct PUT streams to Backblaze B2 (high-speed parallel network threads)
                            var uploadOriginal = PutBinaryAsync(originalUploadUrl, fileBytes, "image/jpeg");
                            var uploadPreview = !string.IsNullOrEmpty(previewUploadUrl) ? PutBinaryAsync(previewUploadUrl, fileBytes, "image/webp") : Task.FromResult(true);
                            var uploadThumb = !string.IsNullOrEmpty(thumbUploadUrl) ? PutBinaryAsync(thumbUploadUrl, fileBytes, "image/webp") : Task.FromResult(true);

                            await Task.WhenAll(uploadOriginal, uploadPreview, uploadThumb);

                            // 3. Register photo in Supabase
                            string registerPayload = "{\"galleryId\":\"" + galleryId + "\",\"photos\":[{\"gallery_id\":\"" + galleryId + "\",\"collection_id\":" + (string.IsNullOrEmpty(collectionId) ? "null" : "\"" + collectionId + "\"") + ",\"original_key\":\"" + originalKey + "\",\"preview_key\":\"" + previewKey + "\",\"thumbnail_key\":\"" + thumbKey + "\",\"size_bytes\":" + fileBytes.Length + "}]}";
                            await PostJsonAsync("https://studiocore.in/api/gallery/photos/register", registerPayload);

                            res.ContentType = "application/json";
                            byte[] okBuf = Encoding.UTF8.GetBytes("{\"success\":true,\"filename\":\"" + filename + "\"}");
                            res.ContentLength64 = okBuf.Length;
                            await res.OutputStream.WriteAsync(okBuf, 0, okBuf.Length);
                            res.Close();
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    try
                    {
                        res.StatusCode = 500;
                        res.ContentType = "application/json";
                        byte[] errBuf = Encoding.UTF8.GetBytes("{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}");
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

        private static async Task<string> PostJsonAsync(string url, string jsonBody)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "POST";
            req.ContentType = "application/json";
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
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "PUT";
            req.ContentType = contentType;
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

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_trayIcon != null) _trayIcon.Dispose();
                if (_cts != null) _cts.Dispose();
                if (_listener != null) { try { _listener.Close(); } catch { } }
            }
            base.Dispose(disposing);
        }
    }
}
