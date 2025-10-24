export const downloadAsFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const formatReceipt = (expense) => {
    const getSplitDetail = (exp) => {
        if (exp.isPayment) {
            return `Payment from ${exp.paidBy} to ${exp.splitBetween[0]}`;
        }
        switch (exp.splitMethod) {
            case 'evenly':
                const share = exp.amount / exp.splitBetween.length;
                return `Split evenly with:\n${exp.splitBetween.map(p => `  - ${p}: $${share.toFixed(2)}`).join('\n')}`;
            case 'amount':
            case 'percentage':
                const details = Object.entries(exp.splitValues).map(([name, value]) => {
                    const amountStr = exp.splitMethod === 'amount' ? `$${value.toFixed(2)}` : `${value}%`;
                    return `  - ${name}: ${amountStr}`;
                }).join('\n');
                return `Split by ${exp.splitMethod}:\n${details}`;
            case 'item':
                const itemDetails = Object.entries(exp.itemized).map(([name, value]) => `  - ${name} (item): $${value.toFixed(2)}`).join('\n');
                let receiptText = `Split by item:\n${itemDetails}`;
                if (exp.amountToSplit && exp.amountToSplit > 0) {
                    receiptText += `\n  - Shared Amount: $${exp.amountToSplit.toFixed(2)} (split evenly)`;
                }
                return receiptText;
            default:
                return 'Split details unavailable';
        }
    };

    let receipt = '---------------------------------\n';
    receipt += `        ${expense.isPayment ? 'Payment' : 'Expense'} Receipt\n`;
    receipt += '---------------------------------\n';
    receipt += `Description: ${expense.description}\n`;
    if (expense.expenseType) receipt += `Type: ${expense.expenseType}\n`;
    receipt += `Total Amount: $${expense.amount.toFixed(2)}\n`;
    if (!expense.isPayment) {
        receipt += `  - Base Amount: $${(expense.baseAmount || expense.amount).toFixed(2)}\n`;
        if (expense.tips) receipt += `  - Tips: $${expense.tips.toFixed(2)}\n`;
        if (expense.tax) receipt += `  - Tax: $${expense.tax.toFixed(2)}\n`;
        if (expense.serviceCharge) receipt += `  - Service Charge: $${expense.serviceCharge.toFixed(2)}\n`;
        if (expense.otherCharges) receipt += `  - Other: $${expense.otherCharges.toFixed(2)}\n`;
    }
    receipt += `Date: ${expense.date}\n`;
    if (expense.isPayment) {
        receipt += `Payment Method: ${expense.paymentMethod}\n`;
    } else {
        receipt += `Paid by: ${expense.paidBy}\n`;
    }
    if (expense.notes) {
        receipt += `Notes: ${expense.notes}\n`;
    }
    receipt += '\nDetails:\n';
    receipt += `${getSplitDetail(expense)}\n`;
    receipt += '---------------------------------\n';
    return receipt;
};

