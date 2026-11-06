'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchHistory } from '@/lib/api';

const CATEGORIES = ['billing', 'sales', 'support', 'unknown'];

export default function HistoryPage() {
  const [category, setCategory] = useState('');
  const historyQuery = useQuery({
    queryKey: ['history', category],
    queryFn: () => fetchHistory(category || undefined),
  });

  const items = historyQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Classification history</h2>
        <p className="mt-1 text-sm text-slate-600">
          The latest 100 classifications, newest first.
        </p>
      </div>

      <label className="flex max-w-sm flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Filter by category</span>
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {historyQuery.isLoading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : historyQuery.isError ? (
        <p className="text-sm text-red-700">Failed to load history.</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {category
            ? `No classifications in ${category} yet.`
            : 'No classifications yet. Classify a request to see it here.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Classified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-md px-4 py-3 font-medium text-slate-900">{item.message}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3 tabular-nums">{item.confidence.toFixed(2)}</td>
                  <td className="px-4 py-3">{item.provider}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
