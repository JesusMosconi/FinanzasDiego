import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type DeudasPdfData = {
  periodLabel: string;
  generatedAt: string;
  debts: Array<{
    id: string;
    group: string;
    name: string;
    pending: number;
  }>;
};

const NAVY = "#131B2E";
const GREEN = "#00714D";
const PALE = "#F4F6FB";
const BORDER = "#DDE3EE";
const MUTED = "#5D6470";
const RED = "#93000A";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingRight: 42,
    paddingBottom: 52,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: NAVY,
  },
  header: {
    padding: 18,
    backgroundColor: NAVY,
    color: "#FFFFFF",
  },
  eyebrow: {
    marginBottom: 5,
    color: "#BFC8DD",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20 },
  period: { marginTop: 5, color: "#DCE5F8", fontSize: 9 },
  summary: {
    marginTop: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: { color: MUTED, fontSize: 8 },
  summaryValue: {
    marginTop: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  total: { color: RED, textAlign: "right" },
  tableHeader: {
    marginTop: 16,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: GREEN,
    color: "#FFFFFF",
    flexDirection: "row",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  row: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  evenRow: { backgroundColor: PALE },
  nameColumn: { width: "48%", paddingRight: 8 },
  groupColumn: { width: "32%", paddingRight: 8 },
  amountColumn: { width: "20%", textAlign: "right" },
  name: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  group: { color: MUTED, fontSize: 8 },
  amount: { color: RED, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  empty: {
    padding: 28,
    borderWidth: 1,
    borderColor: BORDER,
    textAlign: "center",
    color: MUTED,
  },
  footer: {
    position: "absolute",
    right: 42,
    bottom: 20,
    left: 42,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    color: MUTED,
    fontSize: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function DeudasPdf({ data }: { data: DeudasPdfData }) {
  const total = data.debts.reduce((sum, debt) => sum + debt.pending, 0);

  return (
    <Document title={`Deudas - ${data.periodLabel}`} author="FinanzasDiego">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FINANZASDIEGO</Text>
          <Text style={styles.title}>Lista de deudas</Text>
          <Text style={styles.period}>{data.periodLabel}</Text>
        </View>

        <View style={styles.summary} wrap={false}>
          <View>
            <Text style={styles.summaryLabel}>OBLIGACIONES PENDIENTES</Text>
            <Text style={styles.summaryValue}>{data.debts.length}</Text>
          </View>
          <View>
            <Text style={[styles.summaryLabel, styles.total]}>
              TOTAL PENDIENTE
            </Text>
            <Text style={[styles.summaryValue, styles.total]}>
              {money.format(total)}
            </Text>
          </View>
        </View>

        <View fixed style={styles.tableHeader}>
          <Text style={styles.nameColumn}>OBLIGACION</Text>
          <Text style={styles.groupColumn}>GRUPO</Text>
          <Text style={styles.amountColumn}>PENDIENTE</Text>
        </View>

        {data.debts.length === 0 ? (
          <Text style={styles.empty}>
            No hay deudas pendientes para este periodo.
          </Text>
        ) : (
          data.debts.map((debt, index) => (
            <View
              key={debt.id}
              style={[styles.row, ...(index % 2 ? [styles.evenRow] : [])]}
              wrap={false}
            >
              <Text style={[styles.nameColumn, styles.name]}>{debt.name}</Text>
              <Text style={[styles.groupColumn, styles.group]}>
                {debt.group}
              </Text>
              <Text style={[styles.amountColumn, styles.amount]}>
                {money.format(debt.pending)}
              </Text>
            </View>
          ))
        )}

        <View fixed style={styles.footer}>
          <Text>Generado el {date.format(new Date(data.generatedAt))}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
