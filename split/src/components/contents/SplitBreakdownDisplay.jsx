const SplitBreakdownDisplay = ({ expense }) => {
    if (expense.isPayment) {
        return null;
    }

    let breakdownTitle = '';
    let breakdownList = [];

    switch (expense.splitMethod) {
        case 'evenly':
            breakdownTitle = 'Split Evenly';
            const share = expense.amount / expense.splitBetween.length;
            breakdownList = expense.splitBetween.map(name => ({
                name,
                value: `$${share.toFixed(2)}`
            }));
            break;
        case 'amount':
            breakdownTitle = 'Split by Amount';
            breakdownList = Object.entries(expense.splitValues).map(([name, value]) => ({
                name,
                value: `$${value.toFixed(2)}`
            }));
            break;
        case 'percentage':
            breakdownTitle = 'Split by Percentage';
            breakdownList = Object.entries(expense.splitValues).map(([name, value]) => ({
                name,
                value: `${value}% ($${(expense.amount * value / 100).toFixed(2)})`
            }));
            break;
        case 'item':
            breakdownTitle = 'Split by Item';
            const sharedAmount = expense.amountToSplit || 0;
            if (sharedAmount > 0) {
                breakdownTitle += ` (with $${sharedAmount.toFixed(2)} shared)`;
            }

            const baseTotal = expense.baseAmount || 0;
            if (baseTotal > 0) {
                const extras = expense.amount - baseTotal;
                const evenSplitPart = (expense.amountToSplit || 0) / expense.splitBetween.length;

                breakdownList = expense.splitBetween.map(name => {
                    const itemCost = expense.itemized[name] || 0;
                    const personBase = itemCost + evenSplitPart;
                    const proportion = personBase / baseTotal;
                    const shareOfExtras = extras * proportion;
                    const totalShare = personBase + shareOfExtras;

                    let detailString = `Item: $${itemCost.toFixed(2)}`;
                    if (evenSplitPart > 0) detailString += ` + Shared: $${evenSplitPart.toFixed(2)}`;
                    if (shareOfExtras > 0.005) detailString += ` + Extras: $${shareOfExtras.toFixed(2)}`;

                    return {
                        name,
                        value: `$${totalShare.toFixed(2)} (${detailString})`
                    }
                });
            }
            break;
        default:
            return <p>Split details unavailable</p>;
    }

    return (
        <>
            <p className="font-semibold mb-2 text-gray-700">{breakdownTitle}</p>
            <ul className="list-disc list-inside text-gray-600">
                {breakdownList.map(item => (
                    <li key={item.name}>
                        {item.name}: {item.value}
                    </li>
                ))}
            </ul>
        </>
    );
};

export default SplitBreakdownDisplay;
