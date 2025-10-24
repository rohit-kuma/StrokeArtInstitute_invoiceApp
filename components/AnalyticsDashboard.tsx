
import React, { useMemo } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';

const AnalyticsDashboard: React.FC = () => {
    const { invoices, loading } = useInvoices();
    const { theme } = useTheme();

    const stats = useMemo(() => {
        if (!invoices || invoices.length === 0) {
            return { totalSpend: 0, invoiceCount: 0, topVendor: 'N/A', avgInvoice: 0 };
        }
        const totalSpend = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const invoiceCount = invoices.length;

        const vendorCounts = invoices.reduce((acc, inv) => {
            if (inv.vendorName) {
                acc[inv.vendorName] = (acc[inv.vendorName] || 0) + (inv.totalAmount || 0);
            }
            return acc;
        }, {} as Record<string, number>);

        // FIX: Rewrote sort function to be more explicit and avoid potential type inference issues with destructuring.
        const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        return {
            totalSpend,
            invoiceCount,
            topVendor,
            avgInvoice: totalSpend / invoiceCount
        };
    }, [invoices]);

    const monthlyData = useMemo(() => {
        const dataByMonth: { [key: string]: { name: string, spend: number } } = {};
        
        invoices.forEach(inv => {
            if(inv.invoiceDate) {
                try {
                    const month = inv.invoiceDate.substring(0, 7); // YYYY-MM
                     if (!dataByMonth[month]) {
                        const date = new Date(inv.invoiceDate + 'T00:00:00');
                        const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                        dataByMonth[month] = { name: monthName, spend: 0 };
                    }
                    dataByMonth[month].spend += inv.totalAmount || 0;
                } catch(e) {
                    console.error("Invalid date format for invoice", inv.id, inv.invoiceDate);
                }
            }
        });

        return Object.values(dataByMonth).sort((a,b) => a.name.localeCompare(b.name));
    }, [invoices]);
    
    const chartColors = theme === 'dark' ? 
        { grid: '#30363D', text: '#d1d5db', bar: '#388BFD' } :
        { grid: '#e5e7eb', text: '#374151', bar: '#3b82f6' };

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">Analytics Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Visualize your spending trends and invoice data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Spend" value={`₹${stats.totalSpend.toFixed(2)}`} />
                <StatCard title="Total Invoices" value={stats.invoiceCount.toString()} />
                <StatCard title="Average Invoice" value={`₹${stats.avgInvoice.toFixed(2)}`} />
                <StatCard title="Top Vendor" value={stats.topVendor} />
            </div>

            <div className="bg-white/10 dark:bg-dark-card/50 backdrop-blur-lg rounded-xl border border-white/20 dark:border-dark-border p-6">
                <h3 className="text-xl font-bold mb-4">Monthly Spending</h3>
                {invoices.length > 0 ? (
                    <div style={{ width: '100%', height: 400 }}>
                         <ResponsiveContainer>
                            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis dataKey="name" stroke={chartColors.text} />
                                <YAxis stroke={chartColors.text} />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: theme === 'dark' ? '#161B22' : '#ffffff',
                                        border: `1px solid ${chartColors.grid}`
                                    }}
                                />
                                <Legend wrapperStyle={{ color: chartColors.text }} />
                                <Bar dataKey="spend" fill={chartColors.bar} name="Total Spend" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-96">
                        <p className="text-gray-500">No invoice data available to display chart.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string }> = ({ title, value }) => (
    <div className="bg-white/10 dark:bg-dark-card/50 backdrop-blur-lg rounded-xl border border-white/20 dark:border-dark-border p-6">
        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
        <p className="text-3xl font-bold">{value}</p>
    </div>
);

export default AnalyticsDashboard;
