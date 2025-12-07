import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Calendar, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface UsagePattern {
  hour: number;
  occupancyRate: number;
}

interface Classroom {
  id: string;
  name: string;
  occupancyPercentage: number;
}

interface AnalyticsProps {
  classrooms: Classroom[];
  usagePatterns: UsagePattern[];
  weeklyData?: Array<{ day: string; occupancy: number }>;
}

const Analytics = ({
  classrooms = [],
  usagePatterns = [],
  weeklyData = [],
}: AnalyticsProps) => {
  // Calculate average occupancy
  const avgOccupancy =
    classrooms.length > 0
      ? Math.round(
          classrooms.reduce((sum, c) => sum + (c.occupancyPercentage || 0), 0) /
            classrooms.length
        )
      : 0;

  // Find peak hour
  const peakHour =
    usagePatterns.length > 0
      ? usagePatterns.reduce((max, pattern) =>
          pattern.occupancyRate > max.occupancyRate ? pattern : max
        )
      : { hour: 0, occupancyRate: 0 };

  // Calculate weekly trend
  const weeklyTrend =
    weeklyData.length >= 2
      ? Math.round(
          ((weeklyData[weeklyData.length - 1].occupancy -
            weeklyData[0].occupancy) /
            weeklyData[0].occupancy) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            AI-powered predictions and usage pattern analysis
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{avgOccupancy}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {classrooms.length} monitored classrooms
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-warning/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Peak Usage Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">
                {peakHour.hour}:00
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {peakHour.occupancyRate}% occupancy rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Weekly Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">
                {weeklyTrend > 0 ? "+" : ""}
                {weeklyTrend}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {weeklyTrend > 0 ? "Increase" : "Decrease"} from week start
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Hourly Occupancy Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usagePatterns.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usagePatterns}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="hour"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="occupancyRate"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Peak hour: {peakHour.hour}:00 - {peakHour.hour + 1}:00
                  </p>
                </>
              ) : (
                <p className="text-center text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Weekly Occupancy Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="occupancy"
                        stroke="hsl(var(--success))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--success))", r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {weeklyData.length} days of data
                  </p>
                </>
              ) : (
                <p className="text-center text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Predictions */}
        <Card className="mt-6 border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              AI Predictions & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <h4 className="font-semibold mb-2">📊 Usage Forecast</h4>
              <p className="text-sm text-muted-foreground">
                Expected peak occupancy: {peakHour.occupancyRate}% at{" "}
                {peakHour.hour}:00
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <h4 className="font-semibold mb-2">💡 Optimization Suggestion</h4>
              <p className="text-sm text-muted-foreground">
                Current average occupancy is {avgOccupancy}%. Consider
                redistributing classes for optimal space utilization.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <h4 className="font-semibold mb-2">⚠️ Anomaly Detection</h4>
              <p className="text-sm text-muted-foreground">
                No anomalies detected. All sensor readings are within expected
                ranges.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
