import AppNavigator from './navigation/AppNavigator';

export default function App() {
  // Initialize the navigator
  AppNavigator();
  console.log("Parent App root is running");
  return "Parent App Root"; // Or the main App component
}
