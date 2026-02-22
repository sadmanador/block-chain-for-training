"use client";

import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TransactionItem {
    _id: string;
    sender: { _id: string; name: string; email: string };
    receiver: { _id: string; name: string; email: string };
    amount: number;
    createdAt: string;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (session && session.user.role !== "admin") {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    useEffect(() => {
        if (session && session.user.role === "admin") {
            fetchTransactions();
        }
    }, [session]);

    const fetchTransactions = async () => {
        setLoading(true);
        const res = await fetch("/api/transactions");
        if (res.ok) {
            const data = await res.json();
            setTransactions(data);
        }
        setLoading(false);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!session || session.user.role !== "admin") return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                        <span>🛡️</span>
                        <span>Admin Dashboard</span>
                    </h1>
                    <p className="text-slate-400 mt-1">View all transactions across the platform</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <p className="text-sm text-slate-400">Total Transactions</p>
                        <p className="text-2xl font-bold text-white mt-1">{transactions.length}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <p className="text-sm text-slate-400">Total Volume</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mt-1">
                            ${transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <p className="text-sm text-slate-400">Average Transfer</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            ${transactions.length > 0
                                ? Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toLocaleString()
                                : "0"}
                        </p>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                            <span>📋</span>
                            <span>All Transactions</span>
                        </h2>
                        <button
                            onClick={fetchTransactions}
                            className="text-sm px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-slate-400 text-center py-12">No transactions recorded yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700/50">
                                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">#</th>
                                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">Date</th>
                                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">From</th>
                                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">To</th>
                                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {transactions.map((t, i) => (
                                        <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="py-3 text-sm text-slate-500">{i + 1}</td>
                                            <td className="py-3 text-sm text-slate-300">
                                                {new Date(t.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>
                                            <td className="py-3 text-sm">
                                                <span className="text-slate-300">{t.sender.name}</span>
                                                <span className="text-xs text-slate-500 ml-1">({t.sender.email})</span>
                                            </td>
                                            <td className="py-3 text-sm">
                                                <span className="text-slate-300">{t.receiver.name}</span>
                                                <span className="text-xs text-slate-500 ml-1">({t.receiver.email})</span>
                                            </td>
                                            <td className="py-3 text-sm text-right font-semibold text-emerald-400">
                                                ${t.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
