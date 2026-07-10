'use client';

import { useState } from 'react';

interface PortfolioItem {
  id: string;
  address: string;
  region: string;
  sum_insured: number;
  occupancy: string;
  construction: string;
  year_built: string;
  location?: {
    lat: number;
    lng: number;
    formatted_address: string;
  };
}

interface PortfolioTableProps {
  data: PortfolioItem[];
}

export default function PortfolioTable({ data }: PortfolioTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = data.filter(item => 
    item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-lg">Policy List ({filteredData.length})</h2>
        <input
          type="text"
          placeholder="Search address or ID..."
          className="px-3 py-2 border rounded-md text-sm w-64"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium">
            <tr>
              <th className="px-4 py-3">Policy ID</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3 text-right">Sum Insured (HKD)</th>
              <th className="px-4 py-3">Occupancy</th>
              <th className="px-4 py-3">Geocoded</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.id}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={item.address}>{item.address}</td>
                <td className="px-4 py-3">{item.region}</td>
                <td className="px-4 py-3 text-right">{Number(item.sum_insured).toLocaleString()}</td>
                <td className="px-4 py-3">{item.occupancy}</td>
                <td className="px-4 py-3">
                  {item.location ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      No
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
