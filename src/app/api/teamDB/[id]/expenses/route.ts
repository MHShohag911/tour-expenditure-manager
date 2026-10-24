import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type Share = {
    memberName: string;
    amount: number;
};

type Expense = {
    id?: string;
    description: string;
    amount: number;
    payerName: string;
    time: string;
    createdAt?: string;
    shares?: Share[];
};

type Member = {
    name: string;
    totalPaid: number;
    totalOwed: number;
};

type ExtraCharge = {
    extraAmount: number;
    paidBy: string;
    owedBy: string;
};

type GroupDocument = Document & {
    isFinished?: boolean;
    members?: Member[];
    expenses?: Expense[];
    extraCharges?: ExtraCharge[];
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

// Parse legacy "dd/mm/yyyy, hh:mm:ss am/pm" display strings into ISO.
// Returns null when the string doesn't match the expected format.
const parseLegacyTime = (value: string): string | null => {
    if (typeof value !== "string") return null;

    const match = value
        .trim()
        .match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i,
        );

    if (!match) return null;

    const [, dd, mm, yyyy, hh, min, ss, meridiem] = match;
    let hour = Number(hh);
    const isPm = meridiem.toLowerCase() === "pm";
    const isAm = meridiem.toLowerCase() === "am";

    if (isPm && hour !== 12) hour += 12;
    if (isAm && hour === 12) hour = 0;

    const date = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        hour,
        Number(min),
        Number(ss),
    );

    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString();
};

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return Response.json(
                { message: "Invalid group ID." },
                { status: 400 },
            );
        }

        const body = await request.json();

        const description =
            typeof body.description === "string" ? body.description.trim() : "";
        const amount = body.amount;
        const payerName =
            typeof body.payerName === "string" ? body.payerName.trim() : "";
        const time = typeof body.time === "string" ? body.time : "";
        const inputShares: Share[] = body.shares;

        if (!description || !payerName || !time) {
            return Response.json(
                { message: "Description, payer, and time are required." },
                { status: 400 },
            );
        }

        if (
            typeof amount !== "number" ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return Response.json(
                { message: "Expense amount must be greater than zero." },
                { status: 400 },
            );
        }

        if (!Array.isArray(inputShares) || inputShares.length === 0) {
            return Response.json(
                { message: "Expense shares are required." },
                { status: 400 },
            );
        }

        if (
            inputShares.some(
                (share) =>
                    typeof share.memberName !== "string" ||
                    !share.memberName.trim() ||
                    typeof share.amount !== "number" ||
                    !Number.isFinite(share.amount) ||
                    share.amount < 0,
            )
        ) {
            return Response.json(
                { message: "One or more expense shares are invalid." },
                { status: 400 },
            );
        }

        const shares = inputShares.map((share) => ({
            memberName: share.memberName.trim(),
            amount: fromCents(toCents(share.amount)),
        }));

        if (
            new Set(shares.map((share) => share.memberName)).size !==
            shares.length
        ) {
            return Response.json(
                { message: "Each member must appear only once in the shares." },
                { status: 400 },
            );
        }

        if (
            shares.reduce((sum, share) => sum + toCents(share.amount), 0) !==
            toCents(amount)
        ) {
            return Response.json(
                { message: "Expense shares must equal the total amount." },
                { status: 400 },
            );
        }

        if (!shares.some((share) => share.memberName === payerName)) {
            return Response.json(
                { message: "The payer must be included in the shares." },
                { status: 400 },
            );
        }

        const client = await clientPromise;
        const collection = client
            .db(DATABASE_NAME)
            .collection<GroupDocument>(COLLECTION_NAME);

        const groupId = new ObjectId(id);
        const group = await collection.findOne({ _id: groupId });

        if (!group) {
            return Response.json(
                { message: "Group not found." },
                { status: 404 },
            );
        }

        if (group.isFinished === true) {
            return Response.json(
                { message: "Cannot add an expense to a finished tour." },
                { status: 409 },
            );
        }

        const members = group.members ?? [];
        const memberNames = new Set(members.map((member) => member.name));

        if (
            !memberNames.has(payerName) ||
            shares.some((share) => !memberNames.has(share.memberName)) ||
            shares.length !== members.length
        ) {
            return Response.json(
                {
                    message:
                        "Shares must include every group member exactly once.",
                },
                { status: 400 },
            );
        }

        const expenseId = randomUUID();
        const transactionTime = new Date().toISOString();

        // Lazy migration: ensure every existing expense has a stable id
        // and a sortable createdAt. New expense is appended after this.
        const existingExpenses = (group.expenses ?? []).map((item) => {
            const hasId = typeof item.id === "string" && item.id.length > 0;
            const hasCreatedAt =
                typeof item.createdAt === "string" && item.createdAt.length > 0;

            if (hasId && hasCreatedAt) return item;

            return {
                ...item,
                id: hasId ? item.id : randomUUID(),
                createdAt: hasCreatedAt
                    ? item.createdAt
                    : parseLegacyTime(item.time) ?? transactionTime,
            };
        });

        const expense: Expense = {
            id: expenseId,
            description,
            amount: fromCents(toCents(amount)),
            payerName,
            time,
            createdAt: transactionTime,
            shares,
        };

        const expenses = [...existingExpenses, expense];
        const extraCharges = group.extraCharges ?? [];

        // Preserve gross expense totals and existing extra-charge behavior.
        const updatedMembers = members.map((member) => {
            const grossPaidCents = expenses.reduce(
                (sum, item) =>
                    sum +
                    (item.payerName === member.name ? toCents(item.amount) : 0),
                0,
            );

            const extraPaidCents = extraCharges.reduce(
                (sum, item) =>
                    sum +
                    (item.paidBy === member.name
                        ? toCents(item.extraAmount)
                        : 0),
                0,
            );

            const grossOwedCents = expenses.reduce((sum, item) => {
                const savedShare = item.shares?.find(
                    (share) => share.memberName === member.name,
                );

                const shareCents = item.shares
                    ? toCents(savedShare?.amount ?? 0)
                    : members.length > 0
                        ? Math.floor(toCents(item.amount) / members.length)
                        : 0;

                return sum + shareCents;
            }, 0);

            const extraOwedCents = extraCharges.reduce(
                (sum, item) =>
                    sum +
                    (item.owedBy === member.name
                        ? toCents(item.extraAmount)
                        : 0),
                0,
            );

            return {
                ...member,
                totalPaid: fromCents(grossPaidCents + extraPaidCents),
                totalOwed: fromCents(grossOwedCents + extraOwedCents),
            };
        });

        const result = await collection.updateOne(
            { _id: groupId, isFinished: { $ne: true } },
            {
                $set: {
                    // id,
                    members: updatedMembers,
                    expenses,
                },
            },
        );

        if (result.matchedCount === 0) {
            return Response.json(
                {
                    message:
                        "The tour was finished before the expense could be saved.",
                },
                { status: 409 },
            );
        }

        return Response.json(
            {
                message: "Expense saved successfully.",
                expense,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Failed to add expense:", error);

        return Response.json(
            { message: "Failed to add expense." },
            { status: 500 },
        );
    }
}