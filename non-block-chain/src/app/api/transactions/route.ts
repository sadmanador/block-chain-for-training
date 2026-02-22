import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, amount } = await req.json();

    if (!receiverId || !amount) {
      return NextResponse.json(
        { error: "Receiver and amount are required" },
        { status: 400 }
      );
    }

    const transferAmount = Number(amount);
    if (transferAmount <= 0 || !Number.isInteger(transferAmount)) {
      return NextResponse.json(
        { error: "Amount must be a positive integer" },
        { status: 400 }
      );
    }

    if (session.user.id === receiverId) {
      return NextResponse.json(
        { error: "Cannot transfer money to yourself" },
        { status: 400 }
      );
    }

    await dbConnect();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const sender = await User.findById(session.user.id).session(dbSession);
      const receiver = await User.findById(receiverId).session(dbSession);

      if (!sender || !receiver) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      if (sender.balance < transferAmount) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        );
      }

      sender.balance -= transferAmount;
      receiver.balance += transferAmount;

      await sender.save({ session: dbSession });
      await receiver.save({ session: dbSession });

      await Transaction.create(
        [
          {
            sender: sender._id,
            receiver: receiver._id,
            amount: transferAmount,
          },
        ],
        { session: dbSession }
      );

      await dbSession.commitTransaction();

      return NextResponse.json({
        success: true,
        message: `Successfully transferred $${transferAmount} to ${receiver.name}`,
        newBalance: sender.balance,
      });
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    console.error("Transaction error:", error);
    return NextResponse.json(
      { error: "Failed to process transaction" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    let filter = {};
    if (session.user.role !== "admin") {
      const userId = new mongoose.Types.ObjectId(session.user.id);
      filter = {
        $or: [{ sender: userId }, { receiver: userId }],
      };
    }

    const transactions = await Transaction.find(filter)
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
