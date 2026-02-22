"use client";

import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface UserOption {
    _id: string;
    name: string;
    email: string;
}

interface TransactionItem {
    _id: string;
    sender: { _id: string; name: string; email: string };
    receiver: { _id: string; name: string; email: string };
    amount: number;
    createdAt: string;
}

export default function DashboardPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<UserOption[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [receiverId, setReceiverId] = useState("");
    const [amount, setAmount] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (session?.user?.role === "admin") {
            router.push("/admin");
        }
    }, [status, session, router]);

    useEffect(() => {
        if (session && !initialized.current) {
            initialized.current = true;
            setBalance(session.user.balance);
            fetchUsers();
            fetchTransactions();
        }
    }, [session]);

    const fetchUsers = async () => {
        const res = await fetch("/api/users");
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    };

    const fetchTransactions = async () => {
        const res = await fetch("/api/transactions");
        if (res.ok) {
            const data = await res.json();
            setTransactions(data);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiverId, amount: Number(amount) }),
        });

        const data = await res.json();
        setLoading(false);

        if (res.ok) {
            setMessage(data.message);
            setBalance(data.newBalance);
            setAmount("");
            setReceiverId("");
            fetchTransactions();
            await update();
        } else {
            setError(data.error);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!session || session.user.role === "admin") return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Balance Card */}
                <div className="mb-8 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <p className="text-sm text-slate-400 uppercase tracking-wide">Your Balance</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mt-1">
                        ${balance?.toLocaleString() ?? "—"}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Transfer Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                                <span>📤</span>
                                <span>Send Money</span>
                            </h2>

                            <form onSubmit={handleTransfer} className="space-y-4">
                                {message && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">
                                        {message}
                                    </div>
                                )}
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="receiver" className="block text-sm font-medium text-slate-300 mb-2">
                                        Recipient
                                    </label>
                                    <select
                                        id="receiver"
                                        value={receiverId}
                                        onChange={(e) => setReceiverId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select a user...</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
                                        Amount ($)
                                    </label>
                                    <input
                                        id="amount"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        placeholder="Enter amount"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {loading ? "Processing..." : "Send Money"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                                <span>📋</span>
                                <span>Transaction History</span>
                            </h2>

                            {transactions.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No transactions yet</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700/50">
                                                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">Date</th>
                                                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">From</th>
                                                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">To</th>
                                                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide pb-3">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/30">
                                            {transactions.map((t) => {
                                                const isSent = t.sender._id === session.user.id;
                                                return (
                                                    <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                                                        <td className="py-3 text-sm text-slate-300">
                                                            {new Date(t.createdAt).toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </td>
                                                        <td className="py-3 text-sm text-slate-300">{t.sender.name}</td>
                                                        <td className="py-3 text-sm text-slate-300">{t.receiver.name}</td>
                                                        <td className={`py-3 text-sm text-right font-semibold ${isSent ? "text-red-400" : "text-emerald-400"}`}>
                                                            {isSent ? "-" : "+"}${t.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
