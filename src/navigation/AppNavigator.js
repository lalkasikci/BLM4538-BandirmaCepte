import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewsDetailScreen from '../screens/NewsDetailScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsScreen from '../screens/NewsScreen';
import PharmacyScreen from '../screens/PharmacyScreen';
import BusTimeScreen from '../screens/BusTimeScreen';
import WeatherScreen from '../screens/WeatherScreen';
import EarthquakeScreen from '../screens/EarthquakeScreen';
import EmergencyNumbersScreen from '../screens/EmergencyNumbersScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventsDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F5F7FC',
          },
          headerShadowVisible: false,
          headerTintColor: '#182033',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: '#F5F7FC',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
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
          name="Pharmacy"
          component={PharmacyScreen}
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

      </Stack.Navigator>
    </NavigationContainer>
  );
}