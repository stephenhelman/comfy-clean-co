import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 11, color: '#111827' },
  header: { marginBottom: 32 },
  company: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#2B5C78', marginBottom: 4 },
  tagline: { fontSize: 10, color: '#6B7280' },
  divider: { borderBottom: 1, borderColor: '#E5E7EB', marginVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', marginBottom: 3 },
  value: { fontSize: 11, color: '#111827' },
  section: { marginBottom: 20 },
  invoiceTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#2B5C78', marginBottom: 4 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottom: 1, borderColor: '#F3F4F6' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 4 },
  totalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#2B5C78' },
  infoBox: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 4, marginBottom: 16 },
  paymentBox: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 4, marginBottom: 16, border: 1, borderColor: '#FED7AA' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48 },
  footerText: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
})

interface InvoicePdfProps {
  invoice: {
    id?: string
    invoiceNumber: string
    amount: number
    paymentType: string
    status: string
    invoiceDate: Date
    dueDate: Date
  }
  job: {
    id: string
    scheduledAt: Date
    jobType: string
    serviceAddress: string
    serviceCity: string
    serviceZip: string
    notes?: string | null
  }
  client: {
    name: string
    email?: string | null
    phone?: string | null
  }
  zellePaymentLink?: string | null
  adminSiteUrl?: string
}

function JobTypeLabel(t: string) {
  const labels: Record<string, string> = { standard: 'Standard Cleaning', deep: 'Deep Clean', 'move-out': 'Move-Out Cleaning' }
  return labels[t] ?? t
}

export function InvoicePdfDocument({ invoice, job, client, zellePaymentLink, adminSiteUrl }: InvoicePdfProps) {
  const isZelle = invoice.paymentType === 'zelle'
  const payUrl = `${adminSiteUrl ?? 'https://comfycleanco.com'}/pay/${invoice.id}`

  return (
    <Document title={`${invoice.invoiceNumber} — Comfy Clean Co.`}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Text style={styles.company}>Comfy Clean Co.</Text>
              <Text style={styles.tagline}>Far East El Paso, TX · Clean · Fresh · Reliable</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.invoiceTitle}>{invoice.invoiceNumber}</Text>
              <Text style={[styles.label, { textAlign: 'right' }]}>Invoice Date</Text>
              <Text style={styles.value}>{format(new Date(invoice.invoiceDate), 'MMMM d, yyyy')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & Appointment info */}
        <View style={[styles.row, { marginBottom: 24 }]}>
          <View style={styles.section}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{client.name}</Text>
            {client.email && <Text style={styles.value}>{client.email}</Text>}
            {client.phone && <Text style={styles.value}>{client.phone}</Text>}
          </View>
          <View style={[styles.section, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Service Date</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>
              {format(new Date(job.scheduledAt), 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text style={styles.value}>{format(new Date(job.scheduledAt), 'h:mm a')}</Text>
          </View>
        </View>

        {/* Service address */}
        <View style={styles.infoBox}>
          <Text style={styles.label}>Service Address</Text>
          <Text style={styles.value}>{job.serviceAddress}, {job.serviceCity}, TX {job.serviceZip}</Text>
        </View>

        {/* Line items */}
        <View style={styles.divider} />
        <View style={styles.lineItemRow}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Description</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Amount</Text>
        </View>
        <View style={styles.lineItemRow}>
          <Text style={styles.value}>{JobTypeLabel(job.jobType)}</Text>
          <Text style={styles.value}>${invoice.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due</Text>
          <Text style={styles.totalValue}>${invoice.amount.toFixed(2)}</Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.label}>Due By</Text>
          <Text style={[styles.label, { color: '#EF4444' }]}>
            {format(new Date(invoice.dueDate), 'MMMM d, yyyy h:mm a')}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Payment instructions */}
        {isZelle ? (
          <View style={styles.paymentBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#92400E' }}>Pay via Zelle</Text>
            {zellePaymentLink && (
              <Text style={{ fontSize: 10, color: '#1D4ED8' }}>{zellePaymentLink}</Text>
            )}
            <Text style={{ fontSize: 10, color: '#78350F', marginTop: 4 }}>
              Payment link: {payUrl}
            </Text>
          </View>
        ) : (
          <View style={styles.paymentBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#92400E' }}>
              Payment of ${invoice.amount.toFixed(2)} in {invoice.paymentType} is due at time of service.
            </Text>
            <Text style={{ fontSize: 10, color: '#78350F' }}>
              By proceeding with this appointment you agree to pay the above amount.
            </Text>
          </View>
        )}

        {job.notes && (
          <View style={[styles.infoBox, { marginTop: 8 }]}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{job.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancellations made less than 24 hours before your scheduled appointment may be subject to a cancellation fee.
          </Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>
            Comfy Clean Co. · Far East El Paso, TX · comfycleanco.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}
