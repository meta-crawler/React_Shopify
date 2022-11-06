/**
 * @file
 *
 * Wrapper around fetch(), and OAuth access token handling operations.
 *
 * To use import getAuthClient, and initialize a client:
 * const auth = getAuthClient(optionalConfig);
 */

const refreshPromises = [];

/**
 * OAuth client factory.
 *
 * @param {object} config
 *
 * @returns {object}
 *   Returns an object of functions with $config injected.
 */
export function getAuthClient(config = {}) {
  const defaultConfig = {
    // Base URL of your Drupal site.
    base: 'https://kuremendocino.com',
    // Name to use when storing the token in localStorage.
    token_name: 'drupal-oauth-token',
    // OAuth client ID - get from Drupal.
    client_id: 'c02d0901-cba4-44b0-9ec2-963bcd1a6a67',
    // OAuth client secret - set in Drupal.
    client_secret: '4420d1918bbcf7686defdf9560bb5087d20076de5f77b7cb4c3b40bf46ec428b',
    // Drupal user role related to this OAuth client.
    scope: 'kure_app',
    // Margin of time before the current token expires that we should force a
    // token refresh.
    expire_margin: 0,
  };

  // eslint-disable-next-line no-param-reassign
  config = { ...defaultConfig, ...config };

  /**
   * Store an OAuth token retrieved from Drupal in localStorage.
   *
   * @param {object} data
   * @returns {object}
   *   Returns the token with an additional expires_at property added.
   */
  function saveToken(data) {
    // Make a copy of data object.
    const token = { ...data };
    token.date = Math.floor(Date.now() / 1000);
    token.expires_at = token.date + token.expires_in;
    localStorage.setItem(config.token_name, JSON.stringify(token));
    return token;
  }

  /**
   * Exchange a username & password for an OAuth token.
   *
   * @param {string} username
   * @param {string} password
   */
  async function login(username, password) {
    const formData = new FormData();
    formData.append('grant_type', 'password');
    formData.append('client_id', config.client_id);
    formData.append('client_secret', config.client_secret);
    formData.append('scope', config.scope);
    formData.append('username', username);
    formData.append('password', password);
    try {
      const response = await fetch(`${config.base}/oauth/token`, {
        method: 'post',
        headers: new Headers({
          Accept: 'application/json',
        }),
        body: formData,
      });
      const data = await response.json();

      if (response.status === 200) {
        saveToken(data);
        return true;
      }

      if (response.status !== 200) {
        console.log('Error retrieving token', data);
        return false;
      }
    } catch (err) {
      console.log('API got an error', err);
    }

    return false;
  }

  /**
   * Delete the stored OAuth token, effectively ending the user's session.
   */
  function logout() {
    localStorage.removeItem(config.token_name);
    return Promise.resolve(true);
  }

  /**
   * Get the current OAuth token if there is one.
   *
   * Get the OAuth token form localStorage, and refresh it if necessary using
   * the included refresh_token.
   *
   * @returns {Promise}
   *   Returns a Promise that resolves to the current token, or false.
   */
  async function tokenCurrent() {
    const token = localStorage.getItem(config.token_name) !== null
      ? JSON.parse(localStorage.getItem(config.token_name))
      : false;

    if (!token) {
      await Promise.reject();
    }

    const { expiresAt, refreshToken } = token;
    if (expiresAt - config.expire_margin < Date.now() / 1000) {
      return refreshToken(refreshToken);
    }
    return Promise.resolve(token);
  }

  /**
   * Wrapper for fetch() that will attempt to add a Bearer token if present.
   *
   * If there's a valid token, or one can be obtained via a refresh token, then
   * add it to the request headers. If not, issue the request without adding an
   * Authorization header.
   *
   * @param {string} url URL to fetch.
   * @param {object} options Options for fetch().
   */
  // eslint-disable-next-line consistent-return
  async function fetchWithAuthentication(url, options) {
    if (!options.headers.get('Authorization')) {
      const oauthToken = await tokenCurrent();
      if (oauthToken) {
        console.log('using token', oauthToken);
        options.headers.append('Authorization', `Bearer ${oauthToken.access_token}`);
      }
      return fetch(`${config.base}${url}`, options);
    }
  }

  /**
   * Request a new token using a refresh_token.
   *
   * This function is smart about reusing requests for a refresh token. So it is
   * safe to call it multiple times in succession without having to worry about
   * wether a previous request is still processing.
   */
  function tokenRefresh(refreshToken) {
    console.log('getting refresh token');
    if (refreshPromises[refreshToken]) {
      return refreshPromises[refreshToken];
    }

    // Note that the data in the request is different when getting a new token
    // via a refresh_token. grant_type = refresh_token, and do NOT include the
    // scope parameter in the request as it'll cause issues if you do.
    const formData = new FormData();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', config.client_id);
    formData.append('client_secret', config.client_secret);
    formData.append('refresh_token', refreshToken);

    // eslint-disable-next-line no-return-assign
    return (
      refreshPromises[refreshToken] = fetch(`${config.base}/oauth/token`, {
        method: 'post',
        headers: new Headers({
          Accept: 'application/json',
        }),
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          delete refreshPromises[refreshToken];

          if (data.error) {
            console.log('Error refreshing token', data);
            return false;
          }
          return saveToken(data);
        })
        .catch((err) => {
          delete refreshPromises[refreshToken];
          console.log('API got an error', err);
          return Promise.reject(err);
        })
    );
  }

  /**
   * Check if the current user is logged in or not.
   *
   * @returns {Promise}
   */
  async function isLoggedIn() {
    const oauthToken = await tokenCurrent();
    if (oauthToken) {
      return Promise.resolve(true);
    }
    return Promise.reject(new Error('Something bad happened'));
  }

  /**
   * Run a query to /oauth/debug and output the results to the console.
   */
  function debug() {
    const headers = new Headers({
      Accept: 'application/vnd.api+json',
    });

    fetchWithAuthentication('/oauth/debug?_format=json', { headers })
      .then((response) => response.json())
      .then((data) => {
        console.log('debug', data);
      });
  }

  return { debug, login, logout, isLoggedIn, fetchWithAuthentication, token: tokenCurrent, refreshToken: tokenRefresh };
}
