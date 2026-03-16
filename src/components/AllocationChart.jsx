import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsMobile } from "../hooks/useIsMobile";

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-text font-medium">{payload[0].name}</p>
        <p className="text-muted text-sm">R$ {payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
}

function AllocationChart({ fiis, chartType = 'donut', showLegend = true, showLabels = true }) {
  const isMobile = useIsMobile();
  const total = fiis.reduce((sum, fii) => {
    const currentPrice = Number(fii.valorAtual ?? fii.precoMedio);
    return sum + fii.cotas * currentPrice;
  }, 0);

  const data = fiis.map((fii, index) => {
    const currentPrice = Number(fii.valorAtual ?? fii.precoMedio);
    const value = fii.cotas * currentPrice;
    return {
      name: fii.ticker,
      value: value,
      percentage: ((value / total) * 100).toFixed(1),
      fill: COLORS[index % COLORS.length]
  }});

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
        adicione um ativo para ver a alocação
      </div>
    )
  }

  const mobileChartHeight = Math.max(240, data.length * 46);
  const effectiveChartType = isMobile ? 'bar' : chartType;
  const shouldShowLegend = showLegend && !isMobile;

  return (
  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 lg:gap-8">
    <div className="flex-1">
    <ResponsiveContainer width="100%" height={isMobile ? mobileChartHeight : 250}>
      {effectiveChartType === 'bar' ? (
        <BarChart
          data={data}
          layout={isMobile ? 'vertical' : 'horizontal'}
          margin={isMobile ? { top: 10, right: 8, left: 8, bottom: 0 } : { top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          {isMobile ? (
            <>
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={64} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </>
          )}
          <Tooltip content={<CustomTooltip />} animationDuration={0} wrapperStyle={{ outline: "none", zIndex: 100 }} />
        </BarChart>
      ) : (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'pie' ? 0 : 60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
            label={showLabels ? renderLabel : false}
            labelLine={false}
          />
          <Tooltip content={<CustomTooltip />} animationDuration={0} wrapperStyle={{ outline: "none", zIndex: 100 }} />
        </PieChart>
      )}
    </ResponsiveContainer>
  </div>
{shouldShowLegend && (
<div className="flex flex-col gap-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-text text-sm">{item.name}</span>
            {showLabels && <span className="text-muted text-sm">{item.percentage}%</span>}
          </div>
        ))}
      </div>
)}
    </div>
    
  )
}

export default AllocationChart;