import { httpClient } from '@shared/lib/httpClient';

export const DashboardPage = () => {
  const handleTestFetch = async () => {
    try {
      await httpClient.get('https://httpbin.org/status/200');
      alert('Request OK');
    } catch (e) {
      alert(`Request failed: ${String(e)}`);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => void handleTestFetch()}>Test authed fetch</button>
    </div>
  );
};
