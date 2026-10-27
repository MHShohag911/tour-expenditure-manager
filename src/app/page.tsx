export const dynamic = "force-dynamic";
export const revalidate = 0;

  import clientPromise from "@/lib/mongodb";
import Dashboard from "@/components/Dashboard";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

export default async function Page() {
  const client = await clientPromise;
  const groups = await client
    .db(DATABASE_NAME)
    .collection<Group>(COLLECTION_NAME)
    .find({})
    .sort({ _id: -1 })
    .toArray();

  // Convert ObjectId to string for the client component
  const serializedGroups = groups.map((g) => ({
    ...g,
    _id: g._id.toString(),
  }));

  return <Dashboard initialGroups={serializedGroups} />;
}