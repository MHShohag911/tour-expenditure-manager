import Link from "next/link";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import GroupDetailCard from "@/components/GroupDetailCard";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Invalid group ID.</p>
      </div>
    );
  }

  const client = await clientPromise;
  const group = await client
    .db(DATABASE_NAME)
    .collection<Group>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) as unknown as string });

  if (!group) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Group not found.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  const serializedGroup = {
    ...group,
    _id: group._id.toString(),
  };

  return (
    <div className="container mx-auto flex min-h-screen flex-col px-4">
      <main className="flex-1 py-8">
        <Link href="/" className="mb-6 font-bold inline-block text-sm text-[#1DD100]">
          ← Back to groups
        </Link>
        
        <GroupDetailCard group={serializedGroup} />
      </main>
    </div>
  );
}