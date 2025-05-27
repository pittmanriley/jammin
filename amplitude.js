// utils/amplitude.js
import * as amplitude from "@amplitude/analytics-react-native";

export const initAmplitude = () => {
  amplitude.init("6324a0a3dc0ebca74c28d69de0f8dc36"); // Your actual API key
};

export const trackEvent = (name, properties = {}) => {
  amplitude.track(name, properties);
};
