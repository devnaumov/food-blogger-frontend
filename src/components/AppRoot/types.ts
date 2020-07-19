import { StorageValuesMap } from "../../types";
import { NonIndexedHistory } from "vkma-router";
import { ThemeType } from "vkma-ui";

export interface AppRootState {
  loading: boolean;
  error?: string;
  storage?: Partial<StorageValuesMap>;
  theme: ThemeType;
}

export interface AppRootContext {
  /**
   * Initializes application
   */
  init(): void;
}
