import { formatPeso } from '@brewpoint/shared';
import { Card, Chart, Meter, StatTile, Timeline } from '../../src';

const HOURS = [
  '7 AM',
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
  '6 PM',
  '7 PM',
];
const HOURLY = [
  185000, 420000, 512000, 368000, 290000, 455000, 398000, 310000, 426000, 380000, 265000, 190000,
  95000,
];

/** The Chart preview: sales by hour, the last 7 days against the week before, top products. */
export function DashboardCharts() {
  return (
    <div className="bp-stack gap-4">
      <Card title="Sales by hour" meta="Today, 7 AM to 7 PM">
        <Chart
          type="bar"
          title="Sales by hour"
          labels={HOURS}
          format="peso"
          series={[{ name: 'Net sales', values: HOURLY }]}
          labelHeading="Hour"
          emptyText="No sales yet today. Sales appear here as they sync."
        />
      </Card>
      <Card title="Net sales, last 7 days" meta="Sep 22 to Sep 28, against the 7 days before">
        <Chart
          type="line"
          title="Net sales, last 7 days"
          format="peso"
          labels={['Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27', 'Mon 28']}
          series={[
            {
              name: 'This week',
              values: [3842000, 3615000, 4098000, 4521000, 5176000, 4833000, 4294000],
            },
            {
              name: 'Week before',
              compare: true,
              values: [3590000, 3702000, 3911000, 4130000, 4788000, 4605000, 4012000],
            },
          ]}
          labelHeading="Day"
          emptyText="No sales in these 7 days."
        />
      </Card>
      <Card title="Top products" meta="Today, cups and pieces sold">
        <Chart
          type="hbar"
          title="Top products today"
          format="count"
          labels={[
            'Iced Latte',
            'Spanish Latte',
            'Americano',
            'Caramel Macchiato',
            'Butter Croissant',
          ]}
          series={[{ name: 'Sold', values: [64, 51, 38, 33, 27] }]}
          labelHeading="Product"
          emptyText="No sales yet today."
        />
      </Card>
      <Card title="Sales by hour" meta="Today, 7 AM to 7 PM">
        <Chart
          type="bar"
          title="Sales by hour"
          labels={[]}
          format="peso"
          series={[{ name: 'Net sales', values: [] }]}
          labelHeading="Hour"
          emptyText="No sales yet today. Sales appear here as they sync."
        />
      </Card>
    </div>
  );
}

/** The StatTile preview's KPI row, ending with a loading tile. */
export function KpiTiles() {
  return (
    <div className="bp-dash bp-dash--kpis">
      <StatTile
        label="Net sales today"
        value={formatPeso(4294000)}
        spark={[3842, 3615, 4098, 4521, 5176, 4833, 4294]}
        delta={{ direction: 'up', amount: '7.0%', comparison: 'vs last Monday', tone: 'good' }}
      />
      <StatTile
        label="Orders"
        value="312"
        spark={[288, 270, 301, 322, 361, 340, 312]}
        sparkColor="chart-3"
        delta={{ direction: 'up', amount: '4.3%', comparison: 'vs last Monday', tone: 'good' }}
      />
      <StatTile
        label="Average order"
        value={formatPeso(13763)}
        delta={{ direction: 'up', amount: '2.6%', comparison: 'vs last Monday' }}
      />
      <StatTile
        label="Voids and refunds"
        value={formatPeso(86000)}
        delta={{ direction: 'up', amount: '2 voids', comparison: 'vs last Monday', tone: 'bad' }}
      />
      <StatTile label="Gross margin" value={formatPeso(0)} loading />
    </div>
  );
}

/** The SubscriptionScreen preview's usage card, plus a meter at its warning level. */
export function UsageMeters() {
  return (
    <Card title="Usage" meta="Growth plan limits">
      <Meter label="Devices" value={2} limit={3} />
      <Meter label="Branches" value={1} limit={2} />
      <Meter label="Users" value={9} limit={10} />
      <Meter label="Products" value={24} limit={null} />
    </Card>
  );
}

/** The PurchaseOrdersScreen preview's order history in the drawer. */
export function OrderTimeline() {
  return (
    <Timeline
      steps={[
        {
          key: 'created',
          state: 'done',
          content: (
            <>
              <b>Created</b> by Maria Santos, Sep 27, 4:10 PM
            </>
          ),
        },
        {
          key: 'sent',
          state: 'done',
          content: (
            <>
              <b>Sent</b> by email to orders@mindanaobakehouse.ph, Sep 27, 4:12 PM
            </>
          ),
        },
        {
          key: 'arriving',
          state: 'now',
          content: (
            <>
              <b>Arriving today</b>, delivery window 2 to 4 PM
            </>
          ),
        },
        { key: 'received', state: 'upcoming', content: <b>Received</b> },
      ]}
    />
  );
}
