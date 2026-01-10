'use client';

import { useEffect, useState } from 'react';

interface ApiStatus {
  status: string;
  service: string;
  version: string;
}

export default function Home() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/status');
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <main className="text-center">
        <h1 className="text-2xl font-[var(--font-inter)] font-normal text-gray-900 mb-4">
          {loading ? (
            'Loading...'
          ) : error ? (
            `System Offline: ${error}`
          ) : status ? (
            `System Online: ${status.status}`
          ) : (
            'System Status Unknown'
          )}
        </h1>
        {status && (
          <div className="text-sm text-gray-600 font-[var(--font-inter)]">
            <p>{status.service}</p>
            <p className="mt-1">Version {status.version}</p>
          </div>
        )}
      </main>
    </div>
  );
}
