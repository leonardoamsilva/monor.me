import { PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

function AllocationChart({ fiis }) {
  const total = fiis.reduce((sum, fii) => sum + fii.cotas * fii.precoMedio, 0);

  const data = fiis.map((fii, index) => {
    const value = fii.cotas * fii.precoMedio;
    return {
      name: fii.ticker,
      value: value,
      percentage: ((value / total) * 100).toFixed(1),
      fill: COLORS[index % COLORS.length]
  }});

  const CustomTooltip = ({active, payload}) => {
    if(active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-text font-medium">{payload[0].name}</p>
          <p className="text-muted text-sm">R$ {payload[0].value.toFixed(2)}</p>
        </div>
      )
    }
    return null;
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const percentage = (percent * 100).toFixed(1);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="#FAFAFA" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {percentage}%
      </text>
    );
  };

  if(fiis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        adicione um FII para ver a alocação
      </div>
    )
  }
  return (
  <div className="flex items-center gap-8">
    <div className="flex-1">
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
          label={renderLabel}
          labelLine={false}
          />
          <Tooltip content={<CustomTooltip />} animationDuration={0} wrapperStyle={{outline: "none", zIndex:100}} />
          </PieChart>
    </ResponsiveContainer>
  </div>
<div className="flex flex-col gap-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-text text-sm">{item.name}</span>
            <span className="text-muted text-sm">{item.percentage}%</span>
          </div>
        ))}
      </div> 
    </div>
    
  )
}

export default AllocationChart;