import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { OpenRouterChatLanguageModel } from "./openrouter-chat-language-model";
import type {
  OpenRouterChatModelId,
  OpenRouterChatSettings,
} from "./openrouter-chat-settings";
import { OpenRouterCompletionLanguageModel } from "./openrouter-completion-language-model";
import type {
  OpenRouterCompletionModelId,
  OpenRouterCompletionSettings,
} from "./openrouter-completion-settings";

export interface OpenRouterProvider {
  (
    modelId: "openai/gpt-3.5-turbo-instruct",
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel;
  (
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel;

  languageModel(
    modelId: "openai/gpt-3.5-turbo-instruct",
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel;
  languageModel(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel;

  /**
Creates an OpenRouter chat model for text generation.
   */
  chat(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel;

  /**
Creates an OpenRouter completion model for text generation.
   */
  completion(
    modelId: OpenRouterCompletionModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel;
}

export interface OpenRouterProviderSettings {
  /**
Base URL for the OpenRouter API calls.
     */
  baseURL?: string;

  /**
@deprecated Use `baseURL` instead.
     */
  baseUrl?: string;

  /**
API key for authenticating requests.
     */
  apiKey?: string;

  /**
OpenRouter Organization.
     */
  organization?: string;

  /**
OpenRouter project.
     */
  project?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
OpenRouter compatibility mode. Should be set to `strict` when using the OpenRouter API,
and `compatible` when using 3rd party providers. In `compatible` mode, newer
information such as streamOptions are not being sent. Defaults to 'compatible'.
   */
  compatibility?: "strict" | "compatible";

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: typeof fetch;
}

/**
Create an OpenRouter provider instance.
 */
export function createOpenRouter(
  options: OpenRouterProviderSettings = {}
): OpenRouterProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ??
    "https://openrouter.ai/api/v1";

  // we default to compatible, because strict breaks providers like Groq:
  const compatibility = options.compatibility ?? "compatible";

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "OPENAI_API_KEY",
      description: "OpenRouter",
    })}`,
    "OpenRouter-Organization": options.organization,
    "OpenRouter-Project": options.project,
    ...options.headers,
  });

  const createChatModel = (
    modelId: OpenRouterChatModelId,
    settings: OpenRouterChatSettings = {}
  ) =>
    new OpenRouterChatLanguageModel(modelId, settings, {
      provider: "openrouter.chat",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
    });

  const createCompletionModel = (
    modelId: OpenRouterCompletionModelId,
    settings: OpenRouterCompletionSettings = {}
  ) =>
    new OpenRouterCompletionLanguageModel(modelId, settings, {
      provider: "openrouter.completion",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
    });

  const createLanguageModel = (
    modelId: OpenRouterChatModelId | OpenRouterCompletionModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) => {
    if (new.target) {
      throw new Error(
        "The OpenRouter model function cannot be called with the new keyword."
      );
    }

    if (modelId === "openai/gpt-3.5-turbo-instruct") {
      return createCompletionModel(
        modelId,
        settings as OpenRouterCompletionSettings
      );
    }

    return createChatModel(modelId, settings as OpenRouterChatSettings);
  };

  const provider = function (
    modelId: OpenRouterChatModelId | OpenRouterCompletionModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) {
    return createLanguageModel(modelId, settings);
  };

  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;

  return provider as OpenRouterProvider;
}

/**
Default OpenRouter provider instance. It uses 'strict' compatibility mode.
 */
export const openrouter = createOpenRouter({
  compatibility: "strict", // strict for OpenRouter API
});
