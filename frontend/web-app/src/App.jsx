import React from 'react';
import { Provider } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import AppRouter from './AppRouter';
import { fetchCurrentUser } from './store/slices/authSlice';
import './index.css';

function AppContent() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  React.useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token, user]);

  return <AppRouter />;
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
