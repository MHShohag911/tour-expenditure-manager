import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
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

        let y = height - 80;

        
        // Colors
        const brandGreen = rgb(0.11, 0.82, 0); // #1DD100
        const red600 = rgb(0.86, 0.15, 0.15);   // #dc2626
        const gray500 = rgb(0.42, 0.45, 0.50);  // #6b7280
        const lightGreen = rgb(0.11, 0.82, 0);  // For dashed lines
        const gray700 = rgb(55 / 255, 65 / 255, 81 / 255);

        // Load the logo
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.png");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);

            // Draw the logo image
            page.drawImage(logoImage, {
                x: 500,
                y: 725, // Moved up slightly to make room for the text
                width: 40,
                height: 40,
            });

            // Draw the "TEM" text below the logo
            page.drawText("TEM", {
                x: 506, // Centered horizontally under the 40px wide logo
                y: 710, // Placed right below the logo
                size: 12,
                font: boldFont,
                color: brandGreen,
            });
        } catch (error) {
            console.log("Logo not found, skipping...");
        }

        // Helper to draw text and move the cursor down
        const drawText = (text: string, options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; indent?: number }) => {
            const size = options?.size ?? 12;
            const f = options?.bold ? boldFont : font;
            const color = options?.color ?? rgb(0, 0, 0);
            const indent = options?.indent ?? 40;

            if (y < 60) {
                page = pdfDoc.addPage([600, 800]);
                y = height - 50;
            }

            page.drawText(text, { x: indent, y, size, font: f, color });
            y -= size + 8;
        };

        // Helper to draw dashed lines
        const drawDashedLine = (yPos: number) => {
            page.drawLine({
                start: { x: 40, y: yPos },
                end: { x: width - 40, y: yPos },
                thickness: 1,
                color: lightGreen,
                dashArray: [5, 5],
            });
        };

        // Calculate Dates
        const expenses = group.expenses ?? [];
        let dateRange = "No dates";
        let totalDays = 0;

        if (expenses.length > 0) {
            const validDates = expenses
                .map(e => {
                    const d = new Date(e.createdAt || e.time);
                    return isNaN(d.getTime()) ? null : d.getTime();
                })
                .filter((t): t is number => t !== null);

            if (validDates.length > 0) {
                const minDate = new Date(Math.min(...validDates));
                const maxDate = new Date(Math.max(...validDates));
                const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                dateRange = `${fmtDate(minDate)} - ${fmtDate(maxDate)}`;
                totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
            }
        }

        const now = new Date();
        const generatedDate = now.toLocaleString("en-GB", {
            timeZone: "Asia/Dhaka",
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        });

        // 3. Centered Title
        const titleText1 = `${group.name}`;
        const titleText2 = " - Tour Summary";

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
        y -= 20;

        // Draw Top Dashed Line
        drawDashedLine(y);
        y -= 20;

        // 5. Totals
        const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalsX = 40; // Align with the dashed line
        page.drawText(`Total Members: ${group.members.length}`, { x: totalsX, y, size: 10, font });
        y -= 15;
        page.drawText(`Total Expenses: ${expenses.length}`, { x: totalsX, y, size: 10, font });
        y -= 15;
        page.drawText(`Total Spend:  BDT ${totalSpend.toFixed(2)}`, { x: totalsX, y, size: 10, font: boldFont} );
        y -= 15;

        // Draw Middle Dashed Line
        drawDashedLine(y);
        y -= 25; // More space after the line

        // 6. Member Summary
        drawText("Member Summary", { bold: true, size: 16, indent: 40, color: gray700 });
        y -= 5;

        let col = 0;
        const startX = 40;
        const colWidth = 130;

        for (const member of group.members) {
            if (y < 100) {
                page = pdfDoc.addPage([600, 800]);
                y = height - 50;
            }

            const x = startX + (col * colWidth);

             // 1. Draw Member Name (Bold, Black)
            page.drawText(member.name, { x, y, size: 12, font: boldFont, color: rgb(0, 0, 0) });

            // 2. Draw Paid Text and Amount perfectly aligned
            page.drawText("Paid:", { x, y: y - 18, size: 9, font, color: gray500 });
            page.drawText(`${member.totalPaid.toFixed(2)}`, { x: x + 35, y: y - 18, size: 9, font: boldFont, color: brandGreen });

            // 3. Draw Share Text and Amount perfectly aligned
            page.drawText("Share:", { x, y: y - 34, size: 9, font, color: gray500 });
            page.drawText(`${member.totalOwed.toFixed(2)}`, { x: x + 35, y: y - 34, size: 9, font: boldFont, color: red600 });

            const net = member.totalPaid - member.totalOwed;
            const isSettled = Math.abs(net) < 0.005;
            const isCreditor = net > 0;
            let statusLabel = "Settled";
            let statusAmount = "";
            let amountColor = gray500;

            if (!isSettled) {
                if (isCreditor) {
                    statusLabel = "Gets Back ";
                    statusAmount = Math.abs(net).toFixed(2);
                    amountColor = brandGreen;
                } else {
                    statusLabel = "Pay ";
                    statusAmount = Math.abs(net).toFixed(2);
                    amountColor = red600;
                }
            }

            page.drawText(statusLabel, { x, y: y - 52, size: 9, font, color: rgb(0, 0, 0) });
            if (statusAmount) {
                const statusWidth = font.widthOfTextAtSize(statusLabel, 9);
                page.drawText(statusAmount, { x: x + statusWidth, y: y - 52, size: 9, font: boldFont, color: amountColor });
            }

            col++;
            if (col === 4) {
                col = 0;
                y -= 75;
            }
        }

        if (col !== 0) {
            y -= 75;
        }

        y -= 0;
        // Draw Bottom Dashed Line
        drawDashedLine(y);
        y -= 30; // More space after the line

        // 7. Expense List
        drawText("Expense Details", { bold: true, size: 16, indent: 40, color: gray700 });
        y -= 5;

        expenses.forEach((expense, index) => {
            const eDate = expense.createdAt
                ? new Date(expense.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                : expense.time;

            drawText(`${index + 1}. ${expense.description} -  BDT ${expense.amount.toFixed(2)} (Paid by ${expense.payerName})`, { size: 10, indent: 40 });
            y -= -4
            drawText(` ${eDate}`, { size: 8, indent: 48, color: gray500 });
            y -= 2;
        });

        // 7.5 Add Watermark to all pages
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.png");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);

            // Scale it down a bit so it fits nicely
            const watermarkDims = logoImage.scale(0.4);

            const pages = pdfDoc.getPages();
            for (const p of pages) {
                const { width: pw, height: ph } = p.getSize();

                // Because it rotates around the bottom-left corner, we shift it 
                // right and down by half its width/height to center it.
                const x = pw / 2 - watermarkDims.width / 2;
                const y = ph / 2 - watermarkDims.height / 2;

                p.drawImage(logoImage, {
                    x: x,
                    y: y,
                    width: watermarkDims.width,
                    height: watermarkDims.height,
                    opacity: 0.05,
                    rotate: degrees(0), // Set to 0 for straight, or 45 for diagonal
                });
            }
        } catch (error) {
            console.log("Watermark logo not found, skipping...");
        }

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