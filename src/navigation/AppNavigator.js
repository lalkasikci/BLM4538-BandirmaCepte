import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

import HomeScreen from "../screens/HomeScreen";
import WeatherScreen from "../screens/WeatherScreen";
import EarthquakeScreen from "../screens/EarthquakeScreen";
import NewsScreen from "../screens/NewsScreen";
import NewsDetailScreen from "../screens/NewsDetailScreen";
import PharmacyScreen from "../screens/PharmacyScreen";
import BusTimeScreen from "../screens/BusTimeScreen";
import EmergencyNumbersScreen from "../screens/EmergencyNumbersScreen";
import EventsScreen from "../screens/EventsScreen";
import EventDetailScreen from "../screens/EventsDetailScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Weather"
          component={WeatherScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Earthquake"
          component={EarthquakeScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="News"
          component={NewsScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="NewsDetail"
          component={NewsDetailScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Pharmacy"
          component={PharmacyScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Bus"
          component={BusTimeScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Emergency"
          component={EmergencyNumbersScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Events"
          component={EventsScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}