import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import BiometricLockScreen from '../screens/auth/BiometricLockScreen';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { status } = useAuth();

  switch (status) {
    case 'authenticated':
      return <AppNavigator />;
    case 'locked':
      return <BiometricLockScreen />;
    case 'unauthenticated':
      return <AuthNavigator />;
    default:
      return <Loading />;
  }
}
