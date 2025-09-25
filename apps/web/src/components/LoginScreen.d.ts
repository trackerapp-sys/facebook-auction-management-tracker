import type { FacebookAuthState, FacebookGroup } from '../state';
type LoginScreenProps = {
    onAuthenticated: (auth: FacebookAuthState, groups: FacebookGroup[]) => void;
    error?: string | null;
};
declare const LoginScreen: ({ onAuthenticated, error }: LoginScreenProps) => import("react/jsx-runtime").JSX.Element;
export default LoginScreen;
