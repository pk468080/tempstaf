module.exports = ({ config }) => ({
  ...config,

  plugins: [
    "expo-sqlite",
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    ],
  ],
});
