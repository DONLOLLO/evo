import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nime.evo",
  appName: "EVO",
  webDir: "dist",
  ios: {
    contentInset: "always",
    scrollEnabled: true,
    backgroundColor: "#020205",
  },
  android: {
    backgroundColor: "#020205",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
