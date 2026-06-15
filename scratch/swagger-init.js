const MESSAGE_ALIAS_MAP = {
  '/api/create-message-text': '/api/create-message',
  '/api/create-message-media': '/api/create-message',
  '/api/create-message-template': '/api/create-message'
};

const DuplicateMessagePathPlugin = function () {
  return {
    wrapComponents: {
      OperationSummaryPath: (Original, system) => (props) => {
        const shownPath = MESSAGE_ALIAS_MAP[props.path] || props.path;
        return system.React.createElement(Original, { ...props, path: shownPath });
      }
    }
  };
};

window.ui = SwaggerUIBundle({
  url: 'https://whatsboost.in/docs/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  displayRequestDuration: true,
  tryItOutEnabled: true,
  onComplete: () => {
    try {
      const qs = new URLSearchParams(window.location.search || '');
      const authkey = (qs.get('authkey') || '').trim();
      if (authkey && window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
        window.ui.preauthorizeApiKey('ApiKeyAuth', authkey);
      }
      if (authkey && window.ui && typeof window.ui.preauthorizeBearer === 'function') {
        window.ui.preauthorizeBearer('BearerAuth', authkey);
      }
    } catch (error) {}

    const replaceAliasPaths = () => {
      Object.entries(MESSAGE_ALIAS_MAP).forEach(([aliasPath, realPath]) => {
        document.querySelectorAll('.opblock-summary-path, .opblock-control-arrow + span, code').forEach((node) => {
          if ((node.textContent || '').trim() === aliasPath) {
            node.textContent = realPath;
          }
        });
      });
    };

    replaceAliasPaths();
    window.setTimeout(replaceAliasPaths, 50);
  },
  requestInterceptor: (request) => {
    try {
      const url = new URL(request.url, window.location.origin);
      const rewritten = MESSAGE_ALIAS_MAP[url.pathname];
      if (rewritten) {
        url.pathname = rewritten;
      }
      const qs = new URLSearchParams(window.location.search || '');
      const authkey = (qs.get('authkey') || '').trim();
      const appkey = (qs.get('appkey') || '').trim();
      if (url.pathname.startsWith('/api/v1/')) {
        if (authkey && !url.searchParams.get('authkey')) url.searchParams.set('authkey', authkey);
        if (authkey && !url.searchParams.get('apiKey')) url.searchParams.set('apiKey', authkey);
        if (appkey && !url.searchParams.get('appkey')) url.searchParams.set('appkey', appkey);
      }
      request.url = url.toString();
    } catch (error) {}
    try {
      const qs = new URLSearchParams(window.location.search || '');
      const authkey = (qs.get('authkey') || '').trim();
      const appkey = (qs.get('appkey') || '').trim();
      request.headers = request.headers || {};
      if (authkey && !request.headers['x-api-key'] && !request.headers['x-auth-key'] && !request.headers['authorization'] && !request.headers['Authorization']) {
        request.headers['x-api-key'] = authkey;
      }
      if (appkey && !request.headers['appkey']) {
        request.headers.appkey = appkey;
      }
    } catch (error) {}
    return request;
  },
  plugins: [DuplicateMessagePathPlugin],
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset]
});