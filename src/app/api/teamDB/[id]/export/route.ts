import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Group } from "@/types/group";
import fs from "fs";
import path from "path";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
        }

        const client = await clientPromise;
        const group = await client
            .db(DATABASE_NAME)
            .collection<Group>(COLLECTION_NAME)
            .findOne({ _id: new ObjectId(id) as unknown as string });

        if (!group) {
            return NextResponse.json({ message: "Group not found" }, { status: 404 });
        }

        // 1. Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // 2. Add a page
        let page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        let y = height - 60; // Start slightly lower to clear the logo

        // Load the logo
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.png");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);

            page.drawImage(logoImage, {
                x: 500, // Top right
                y: 720,
                width: 40,
                height: 40,
            });
        } catch (error) {
            console.log("Logo not found, skipping...");
        }

        // Colors
        const brandGreen = rgb(0.11, 0.82, 0); // #1DD100
        const green700 = rgb(0.02, 0.47, 0.34); // #047857
        const red600 = rgb(0.86, 0.15, 0.15);   // #dc2626
        const gray500 = rgb(0.42, 0.45, 0.50);  // #6b7280

        // Helper to draw text and move the cursor down
        const drawText = (text: string, options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; indent?: number }) => {
            const size = options?.size ?? 12;
            const f = options?.bold ? boldFont : font;
            const color = options?.color ?? rgb(0, 0, 0);
            const indent = options?.indent ?? 50;

            if (y < 60) {
                page = pdfDoc.addPage([600, 800]);
                y = height - 50;
            }

            page.drawText(text, { x: indent, y, size, font: f, color });
            y -= size + 8;
        };

        // Calculate Dates
        const expenses = group.expenses ?? [];
        let dateRange = "No dates";
        let totalDays = 0;

        if (expenses.length > 0) {
            const dates = expenses.map(e => new Date(e.createdAt || new Date(e.time).toISOString()));
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

            const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            dateRange = `${fmtDate(minDate)} - ${fmtDate(maxDate)}`;
            totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
        }

        const now = new Date();
        const generatedDate = now.toLocaleString("en-GB", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        });

        // 3. Centered Title
        const titleText1 = `${group.name} - `;
        const titleText2 = "Tour Summary";

        const textWidth1 = boldFont.widthOfTextAtSize(titleText1, 24);
        const textWidth2 = boldFont.widthOfTextAtSize(titleText2, 24);
        const totalTextWidth = textWidth1 + textWidth2;
        const startXHeader = (width - totalTextWidth) / 2;

        page.drawText(titleText1, { x: startXHeader, y, size: 24, font: boldFont, color: brandGreen });
        page.drawText(titleText2, { x: startXHeader + textWidth1, y, size: 24, font: boldFont, color: rgb(0, 0, 0) });
        y -= 30;

        // 4. Centered Dates & Generated time
        const datesText = `Dates: ${dateRange} (${totalDays} days)`;
        const datesWidth = font.widthOfTextAtSize(datesText, 10);
        page.drawText(datesText, { x: (width - datesWidth) / 2, y, size: 10, font, color: rgb(0, 0, 0) });
        y -= 15;

        const genText = `Generated on: ${generatedDate}`;
        const genWidth = font.widthOfTextAtSize(genText, 9);
        page.drawText(genText, { x: (width - genWidth) / 2, y, size: 9, font, color: gray500 });
        y -= 25;

        // 5. Totals
        const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
        drawText(`Total Members: ${group.members.length}`);
        drawText(`Total Expenses: ${expenses.length}`);
        drawText(`Total Spend: BDT ${totalSpend.toFixed(2)}`);
        y -= 15;

        // 6. Member Summary
        drawText("Member Summary", { bold: true, size: 16 });
        y -= 10;

        let col = 0;
        const startX = 60;
        const colWidth = 170;

        for (const member of group.members) {
            if (y < 100) {
                page = pdfDoc.addPage([600, 800]);
                y = height - 50;
            }

            const x = startX + (col * colWidth);

                  // 1. Draw Member Name (Bold)
      page.drawText(member.name, { x, y, size: 12, font: boldFont, color: rgb(0, 0, 0) });
      
      page.drawText("Paid: BDT ", { x, y: y - 18, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(`${member.totalPaid.toFixed(2)}`, { x: x + 45, y: y - 18, size: 9, font: boldFont, color: brandGreen });

      page.drawText("Share: BDT ", { x, y: y - 34, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(`${member.totalOwed.toFixed(2)}`, { x: x + 50, y: y - 34, size: 9, font: boldFont, color: red600 });

            const net = member.totalPaid - member.totalOwed;
            const isSettled = Math.abs(net) < 0.005;
            const isCreditor = net > 0;
            let statusText = "Settled";
            let statusColor = green700;

            if (!isSettled) {
                if (isCreditor) {
                    statusText = `Gets back ${Math.abs(net).toFixed(2)}`;
                    statusColor = green700;
                } else {
                    statusText = `Owes ${Math.abs(net).toFixed(2)}`;
                    statusColor = red600;
                }
            }

            page.drawText(statusText, { x, y: y - 52, size: 9, font: boldFont, color: statusColor });

            col++;

            if (col === 3) {
                col = 0;
                y -= 75;
            }
        }

        if (col !== 0) {
            y -= 75;
        }

        y -= 15;

        // 7. Expense List
        drawText("Expense Details", { bold: true, size: 16 });
        y -= 5;

        expenses.forEach((expense, index) => {
            const eDate = expense.createdAt
                ? new Date(expense.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                : expense.time;

            drawText(`${index + 1}. ${expense.description} - BDT ${expense.amount.toFixed(2)} (Paid by ${expense.payerName})`, { size: 10, indent: 60 });
            drawText(`${eDate}`, { size: 8, indent: 70, color: gray500 });
            y -= 2;
        });

        // 8. Save and return
        const pdfBytes = await pdfDoc.save();

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${group.name.replace(/\s+/g, '_')}_Summary.pdf"`,
            },
        });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        return NextResponse.json({ message: "Failed to generate PDF" }, { status: 500 });
    }
}