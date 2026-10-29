import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 text-justify">
      <Link href="/" className="text-sm font-medium text-[#1DD100] hover:text-gray-900">
        ← Back to Home
      </Link>

      <h1 className="mt-6 text-4xl font-bold text-[#111827]">How to use TEM</h1>
      <p className="mt-2 text-lg text-gray-600">
        
        A quick guide to managing your tour expenses and A/C balances.
      </p>
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <p className="font-semibold mb-1">Important: A/C Balance is Virtual</p>
        <p className="text-sm leading-relaxed">
          The A/C Balance in this app acts as <strong>virtual money</strong> to help you calculate who owes what. It is <strong>not</strong> actual money. To settle debts, members must pay each other in real life (via cash, bKash, bank transfer, etc.). Only <em>after</em> the real money is paid should you update the A/C balance to reflect the settlement.
        </p>
      </div>

      <div className="mt-10 space-y-8 text-gray-700">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Setup the Group</h2>
          <p className="leading-relaxed">
            Create a group, add all the members, and click <strong>"Set Group"</strong> when everyone is added. This locks the member list. After this, you can start adding expenses.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Add Expenses</h2>
          <p className="leading-relaxed">
            Add an expense by entering the description, amount, and who paid. You can split it equally or use <strong>Custom Split</strong> if someone had an extra item (like an expensive meal) and you want to assign them a specific amount.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">3. A/C Balances (Deposits)</h2>
                    <p className="leading-relaxed">
            The A/C balance is a <strong>virtual wallet</strong> used only for tracking calculations. If a member hands over ৳5,000 in cash to the group leader, the leader records a <strong>Deposit</strong> of ৳5,000 into that member's A/C. 
          </p>
          <p className="mt-3 leading-relaxed">
            When an expense is added, the member's share is deducted from their virtual A/C balance. If they run out of A/C money, the app tracks what they still owe. Real money must still be handed over outside the app to settle the final difference.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Settle Debts</h2>
          <p className="leading-relaxed">
            If someone has money in their A/C and owes money to a specific person (e.g., the person who paid for the hotel), they can click <strong>"Settle Debts from A/C"</strong>. This transfers the money directly from their wallet to the creditor's wallet.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Finish the Tour</h2>
          <p className="leading-relaxed">
            Once the tour is over, click <strong>"Finish Tour"</strong>. This locks the group so no more expenses or deposits can be added. You can then view the final summary, download a PDF, or just review who owes what.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Locking the Group</h2>
          <p className="leading-relaxed">
            If you want to prevent any accidental changes (like someone deleting a big expense), you can click the <strong>Lock</strong> button at the top right of the group. It will ask you to set a 6-digit PIN. Once locked, you need that PIN to add, delete, or modify anything in the group, including deleting the group itself.
          </p>
        </section>
      </div>
      
      <div className="mt-12 border-t border-dashed border-[#1DD100] pt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-[#1DD100] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#19B300]"
        >
          Got it, let's start!
        </Link>
      </div>
    </div>
  );
}