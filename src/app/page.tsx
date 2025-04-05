"use client";
import { useState, useEffect, ChangeEvent } from "react";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { Trade } from "./types/trade";
import TradeSummary from "./components/TradeSummary";

// Inisialisasi Supabase client
const supabase = createClient(
  "https://pcjmsgyphqqfpsvkpfbz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjam1zZ3lwaHFxZnBzdmtwZmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MzM4ODksImV4cCI6MjA1OTQwOTg4OX0.CHrrdL773HnIJXJl6U4_CZgpKvcRZB8p7rSOCR2pVNU"
);

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempSelectedAccount, setTempSelectedAccount] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");


  // Ambil daftar akun yang tersedia dari database saat komponen dimuat
  useEffect(() => {
    fetchAvailableAccounts();
  }, []);

  // Ambil data trades ketika akun dipilih
  useEffect(() => {
    if (selectedAccount) {
      fetchTrades(selectedAccount);
    }
  }, [selectedAccount]);

  // Fungsi untuk mengambil daftar akun yang tersedia
  const fetchAvailableAccounts = async () => {
    try {
      const { data, error } = await supabase
      .from("distinct_accounts") // Query the view
      .select("account_number");

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const accounts = data.map((item) => item.account_number);
        setAvailableAccounts(accounts);
      }
    } catch (err) {
      setError(
        "Error fetching accounts: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      console.error(err);
    }
  };

  const fetchTrades = async (account: string) => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("account_number", account);

    if (error) {
      setError("Error fetching trades: " + error.message);
      console.error(error);
    } else if (data && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedTrades: Trade[] = data.map((row: any) => ({
        openTime: row.open_time,
        closeTime: row.close_time,
        type: row.type,
        item: row.item,
        profit: parseFloat(row.profit) || 0,
      }));
      setTrades(parsedTrades);
      setAccountNumber(account);
      setError(null);
    } else {
      setTrades([]);
      setError("No trades found for this account. Please upload a CSV.");
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseCSVFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "text/csv") {
      parseCSVFile(file);
    } else {
      setError("Please upload a CSV file");
    }
  };

  const parseCSVFile = (file: File) => {
    Papa.parse(file, {
      delimiter: ";",
      skipEmptyLines: true,
      complete: async (result: Papa.ParseResult<string[]>) => {
        try {
          const accountRow = result.data[1];
          const accountNum = accountRow[1] || "Unknown";
          setAccountNumber(accountNum);

          const startIndex = result.data.findIndex((row) =>
            row[0] === "Closed Transactions:"
          );
          if (startIndex === -1) {
            throw new Error("No 'Closed Transactions' section found");
          }

          const dataRows = result.data.slice(startIndex + 2);
          const parsedTrades: Trade[] = dataRows
            .filter(
              (row) =>
                row.length > 1 &&
                row[1].includes("2025") &&
                row[2] !== "balance" &&
                row[2] !== "credit"
            )
            .map((row) => ({
              openTime: row[1],
              closeTime: row[8],
              type: row[2],
              item: row[4],
              profit: parseFloat(row[13]) || 0,
            }));

          // Simpan ke Supabase
          const tradesToInsert = parsedTrades.map((trade) => ({
            account_number: accountNum,
            open_time: trade.openTime,
            close_time: trade.closeTime,
            type: trade.type,
            item: trade.item,
            profit: trade.profit,
          }));

          const { error: insertError } = await supabase
            .from("trades")
            .insert(tradesToInsert);

          if (insertError) {
            throw new Error("Error saving to database: " + insertError.message);
          }

          setTrades(parsedTrades);
          setSelectedAccount(accountNum);
          setError(null);
          
          // Perbarui daftar akun yang tersedia
          fetchAvailableAccounts();
          
        } catch (err) {
          setError(
            "Error parsing CSV file: " +
              (err instanceof Error ? err.message : "Unknown error")
          );
          console.error(err);
        }
      },
      error: (err: Error) => {
        setError("Error reading CSV file: " + err.message);
        console.error(err);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
            Trading Journal🎉
          </h1>
          <p className="text-blue-100 mt-1 text-center">kuncinya displin</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all 
            ${isDragging ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">
              Drag and drop your CSV file here, or
            </p>
            <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Only CSV files are supported
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Daftar akun yang tersedia */}
        {availableAccounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pilih Akun Trading:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {availableAccounts.map((account) => (
                <div 
                  key={account}
                  onClick={() => {
                    setTempSelectedAccount(account);
                    setShowPasswordModal(true);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAccount === account 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 ${selectedAccount === account ? "text-blue-600" : "text-gray-400"}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                        />
                      </svg>
                    </div>
                    <span className={`font-medium ${selectedAccount === account ? "text-blue-700" : "text-gray-700"}`}>
                      {account} - Yearsky
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trading Data */}
        {trades.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-3">
              <h1 className="text-2xl font-semibold text-gray-800 mb-4">
                Akun: {accountNumber} - Yearsky
              </h1>
            </div>
            <TradeSummary trades={trades} />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700">
              No trading data yet
            </h2>
            <p className="text-gray-500 mt-2">
              Upload a CSV file or select an account to see your trading summary.
            </p>
          </div>
        )}
      </main>
      {showPasswordModal && (
  <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30 z-50">

    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Enter Password</h2>
      <input
        type="password"
        placeholder="Password"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {passwordError && <p className="text-red-500 mt-2 text-sm">{passwordError}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => {
            setShowPasswordModal(false);
            setPassword("");
            setPasswordError("");
          }}
          className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (password === "test1234") {
              setSelectedAccount(tempSelectedAccount!);
              setShowPasswordModal(false);
              setPassword("");
              setPasswordError("");
            } else {
              setPasswordError("Incorrect password");
            }
          }}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}