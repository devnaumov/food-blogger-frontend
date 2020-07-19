import React, { PureComponent } from "react";

import { AppLoadingView } from "../views/AppLoadingView";
import { AppCrashView } from "../views/AppCrashView";
import App from "../App";
import { Router } from "vkma-router";
import { ServicePanel } from "../misc/ServicePanel";
import {
  DeviceProvider,
  ThemeProviderConnected,
  GlobalStyleSheet,
  ThemeType,
  createBrightLightTheme,
  getLaunchParams,
} from "vkma-ui";
import { VKStorageProvider } from "../VKStorageProvider";
import { ConfigProvider } from "../ConfigProvider";
import { ApolloProvider, createApolloClient } from "../ApolloProvider";
import { Provider as StoreProvider, ReactReduxContext } from "react-redux";

import { createReduxStore, ReduxState } from "../../redux";
import { appRootContext } from "./context";
import vkBridge, {
  AppearanceSchemeType,
  VKBridgeSubscribeHandler,
} from "@vkontakte/vk-bridge";
import { getStorageKeys } from "../../utils";
import config from "../../config";

import { AppRootState, AppRootContext } from "./types";
import { StorageFieldEnum, StorageValuesMap } from "../../types";
import { Store } from "redux";
import { RegisterMutation } from "../../types/gql";
import { registerMutation } from "../../types/gql";

const { Provider: AppRootProvider } = appRootContext;

// Assign human-readable store provider name for debugging purposes
ReactReduxContext.displayName = "StoreProvider";

/**
 * Root application component. Everything application requires for showing
 * first screen is being loaded here
 */
export class AppRoot extends PureComponent<{}, AppRootState> {
  /**
   * Application root context
   * @type {{init: () => Promise<void>}}
   */
  private appRootContext: AppRootContext = { init: this.init.bind(this) };

  /**
   * Redux store
   * @type {Store<ReduxState>}
   */
  private readonly store: Store<ReduxState> = createReduxStore();

  /**
   * Application launch parameters
   * @type {LaunchParams}
   */
  private readonly launchParams = getLaunchParams(
    window.location.search.slice(1)
  );
  private readonly launchParamsStr = window.location.search.slice(1);

  private client = createApolloClient(
    config.gqlHttpUrl,
    config.gqlWsUrl,
    this.launchParamsStr
  );

  public state: AppRootState = {
    loading: true,
    theme: createBrightLightTheme,
  };

  public async componentDidMount() {
    // When component did mount, we are waiting for application config from
    // bridge and add event listener
    vkBridge.subscribe(this.onVKBridgeEvent);

    // Update device interface colors if required
    if (vkBridge.supports("VKWebAppSetViewSettings")) {
      await vkBridge.send("VKWebAppSetViewSettings", {
        status_bar_style: "dark",
        action_bar_color: "black",
      });
    }

    // Init application
    await this.init();
  }

  public componentDidCatch(error: Error) {
    // Catch error if it did not happen before
    this.setState({ error: error.message });
  }

  public componentWillUnmount() {
    // When component unloads, remove all event listeners
    vkBridge.unsubscribe(this.onVKBridgeEvent);
  }

  public render() {
    const { loading, error, storage, theme } = this.state;

    if (loading || !storage || error) {
      const init = this.init.bind(this);

      return (
        <DeviceProvider automaticUpdate={true}>
          <ThemeProviderConnected theme={theme}>
            <GlobalStyleSheet>
              {error ? (
                <AppCrashView onRestartClick={init} error={error} />
              ) : (
                <AppLoadingView />
              )}
            </GlobalStyleSheet>
          </ThemeProviderConnected>
        </DeviceProvider>
      );
    }
    const { store, appRootContext, launchParams, launchParamsStr } = this;
    const { gqlWsUrl, gqlHttpUrl } = config;

    return (
      <AppRootProvider value={appRootContext}>
        <StoreProvider store={store}>
          <VKStorageProvider storage={storage}>
            <DeviceProvider automaticUpdate={true}>
              <ConfigProvider
                launchParams={launchParams}
                envConfig={config}
                automaticUpdate={true}
              >
                <ApolloProvider
                  httpUrl={gqlHttpUrl}
                  wsUrl={gqlWsUrl}
                  launchParams={launchParamsStr}
                >
                  <ThemeProviderConnected theme={theme}>
                    <GlobalStyleSheet>
                      <App />
                      <ServicePanel />
                    </GlobalStyleSheet>
                  </ThemeProviderConnected>
                </ApolloProvider>
              </ConfigProvider>
            </DeviceProvider>
          </VKStorageProvider>
        </StoreProvider>
      </AppRootProvider>
    );
  }

  /**
   * Checks if event is VKWebAppUpdateConfig to know application config
   * sent from bridge
   * @param {VKBridgeEvent<ReceiveMethodName>} event
   */
  private onVKBridgeEvent: VKBridgeSubscribeHandler = (event) => {
    if (event.detail && event.detail.type === "VKWebAppUpdateConfig") {
      const scheme =
        "scheme" in event.detail.data
          ? event.detail.data.scheme
          : "client_light";
      const themes: Record<AppearanceSchemeType, ThemeType> = {
        client_dark: createBrightLightTheme,
        space_gray: createBrightLightTheme,
        client_light: createBrightLightTheme,
        bright_light: createBrightLightTheme,
      };

      this.setState({ theme: themes[scheme] });
    }
  };

  /**
   * Initializes application
   */
  private async init() {
    this.setState({ loading: true });

    try {
      // Performing all async operations and getting data to launch application
      const [storage, userInfo] = await Promise.all([
        getStorageKeys<StorageValuesMap>(...Object.values(StorageFieldEnum)),
        vkBridge.send("VKWebAppGetUserInfo"),
      ]);

      await this.client.mutate<RegisterMutation>({
        mutation: registerMutation,
      });

      // Create history depending on initial data

      // this.setState({loading: false, storage: {}, history});
      this.setState({ loading: false, storage });
    } catch (e) {
      // In case error appears, catch it and display
      this.setState({ error: e.message, loading: false });
    }
  }
}
