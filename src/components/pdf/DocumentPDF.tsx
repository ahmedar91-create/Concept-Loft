import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer';
import { computeDocumentTotals } from '../../lib/fiscal';
import type { AppSettings, SalesDocument } from '../../data/types';

// Désactive le hyphenation automatique (coupures de mots indésirables).
Font.registerHyphenationCallback((word) => [word]);

/** Formatage monétaire sûr pour le PDF (espaces normales, 3 décimales). */
function fmt(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const [int, dec] = v.toFixed(3).split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSep},${dec}`;
}
function fmtTND(n: number): string {
  return `${fmt(n)} TND`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const INK = '#0a0a0a';
const SOFT = '#5b5b63';
const FAINT = '#8a8a93';
const LINE = '#e0e0e4';

const s = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: INK,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 26,
  },
  logoMain: { fontSize: 24, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: INK, lineHeight: 1 },
  logoSub: { fontSize: 8, letterSpacing: 5, color: INK, marginTop: 4, lineHeight: 1 },
  company: { marginTop: 8, color: SOFT, fontSize: 8.5, maxWidth: 200 },
  docTitleWrap: { alignItems: 'flex-end' },
  docTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', letterSpacing: 2, lineHeight: 1, marginBottom: 12 },
  docMeta: { fontSize: 9.5, color: SOFT, textAlign: 'right', lineHeight: 1.7 },
  docMetaStrong: { color: INK, fontFamily: 'Helvetica-Bold' },

  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, gap: 20 },
  block: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 12,
  },
  blockLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: FAINT,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  blockName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 2 },
  blockText: { color: SOFT, fontSize: 9 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6, overflow: 'hidden' },
  thead: { flexDirection: 'row', backgroundColor: '#f4f4f5', borderBottomWidth: 1, borderColor: LINE },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: SOFT, paddingVertical: 7, paddingHorizontal: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: LINE },
  td: { paddingVertical: 7, paddingHorizontal: 8, fontSize: 9 },
  cDesign: { width: '33%' },
  cDesc: { width: '31%', color: SOFT },
  cQte: { width: '8%', textAlign: 'center' },
  cPu: { width: '13%', textAlign: 'right' },
  cMontant: { width: '15%', textAlign: 'right' },
  itemName: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  itemDim: { color: FAINT, fontSize: 8, marginTop: 1 },

  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, gap: 20 },
  signatureRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 40 },
  signatureBox: {
    width: 200,
    height: 78,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 8,
  },
  signatureLabel: { fontSize: 8, color: FAINT, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  notes: { flex: 1, fontSize: 8.5, color: SOFT },
  totals: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5 },
  totalLabel: { color: SOFT, fontSize: 9 },
  totalValue: { fontSize: 9 },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderColor: INK,
  },
  netLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  netValue: { fontFamily: 'Helvetica-Bold', fontSize: 12 },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderColor: LINE,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: FAINT,
  },
});

export function DocumentPDF({ doc, settings }: { doc: SalesDocument; settings: AppSettings }) {
  const totals = computeDocumentTotals(
    doc.lines.map((l) => ({ prixUnitaireTTC: l.prixUnitaireTTC, quantite: l.quantite })),
    doc.livraisonTTC,
    settings.fiscal,
  );
  const title = doc.type === 'devis' ? 'DEVIS' : 'FACTURE';
  const tvaPct = Math.round(settings.fiscal.tvaRate * 100);
  const fodecPct = Math.round(settings.fiscal.fodecRate * 100);
  const c = settings.company;

  return (
    <Document title={`${title} ${doc.numero}`} author={c.nom}>
      <Page size="A4" style={s.page}>
        {/* En-tête : logo + société / titre */}
        <View style={s.header}>
          <View>
            <Text style={s.logoMain}>LOFT</Text>
            <Text style={s.logoSub}>CONCEPT</Text>
            <View style={s.company}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: INK }}>{c.nom}</Text>
              <Text>{c.adresse}</Text>
              <Text>Tel : {c.telephone}</Text>
              <Text>MF : {c.matriculeFiscal}</Text>
            </View>
          </View>
          <View style={s.docTitleWrap}>
            <Text style={s.docTitle}>{title}</Text>
            <View style={s.docMeta}>
              <Text>
                N° <Text style={s.docMetaStrong}>{doc.numero || '-'}</Text>
              </Text>
              <Text>
                Date <Text style={s.docMetaStrong}>{fmtDate(doc.date)}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Client */}
        <View style={s.parties}>
          <View style={s.block}>
            <Text style={s.blockLabel}>CLIENT</Text>
            <Text style={s.blockName}>{doc.client.nom || '-'}</Text>
            {!!doc.client.adresse && <Text style={s.blockText}>{doc.client.adresse}</Text>}
            {!!doc.client.telephone && <Text style={s.blockText}>Tel : {doc.client.telephone}</Text>}
            {!!doc.client.matriculeFiscal && (
              <Text style={s.blockText}>MF : {doc.client.matriculeFiscal}</Text>
            )}
          </View>
        </View>

        {/* Articles (sans prix TTC unitaire — présentation HT formelle) */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cDesign]}>DESIGNATION</Text>
            <Text style={[s.th, s.cDesc]}>DESCRIPTION</Text>
            <Text style={[s.th, s.cQte]}>QTE</Text>
            <Text style={[s.th, s.cPu]}>P.U. HT</Text>
            <Text style={[s.th, s.cMontant]}>MONTANT HT</Text>
          </View>

          {doc.lines.map((l, i) => {
            const r = totals.lines[i];
            return (
              <View style={s.tr} key={l.id} wrap={false}>
                <View style={[s.td, s.cDesign]}>
                  <Text style={s.itemName}>{l.nom || '-'}</Text>
                  {!!l.dimensions && <Text style={s.itemDim}>Dim. : {l.dimensions}</Text>}
                </View>
                <Text style={[s.td, s.cDesc]}>{l.description || '-'}</Text>
                <Text style={[s.td, s.cQte]}>{l.quantite}</Text>
                <Text style={[s.td, s.cPu]}>{fmt(r.prixUnitaireHT)}</Text>
                <Text style={[s.td, s.cMontant]}>{fmt(r.ht)}</Text>
              </View>
            );
          })}

          {totals.livraison && (
            <View style={s.tr} wrap={false}>
              <View style={[s.td, s.cDesign]}>
                <Text style={s.itemName}>Livraison</Text>
              </View>
              <Text style={[s.td, s.cDesc]}>Frais de livraison</Text>
              <Text style={[s.td, s.cQte]}>1</Text>
              <Text style={[s.td, s.cPu]}>{fmt(totals.livraison.prixUnitaireHT)}</Text>
              <Text style={[s.td, s.cMontant]}>{fmt(totals.livraison.ht)}</Text>
            </View>
          )}
        </View>

        {/* Totaux + notes */}
        <View style={s.bottom}>
          <View style={s.notes}>
            {!!doc.notes && (
              <>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 3 }}>
                  Notes
                </Text>
                <Text>{doc.notes}</Text>
              </>
            )}
          </View>
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{fmtTND(totals.totalHT)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>FODEC ({fodecPct}%)</Text>
              <Text style={s.totalValue}>{fmtTND(totals.totalFODEC)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TVA ({tvaPct}%)</Text>
              <Text style={s.totalValue}>{fmtTND(totals.totalTVA)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total TTC</Text>
              <Text style={s.totalValue}>{fmtTND(totals.totalTTC)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Timbre fiscal</Text>
              <Text style={s.totalValue}>{fmtTND(totals.timbreFiscal)}</Text>
            </View>
            <View style={s.netRow}>
              <Text style={s.netLabel}>NET A PAYER</Text>
              <Text style={s.netValue}>{fmtTND(totals.netAPayer)}</Text>
            </View>
          </View>
        </View>

        {/* Pied de page */}
        <View style={s.footer} fixed>
          <Text>
            {c.nom} — {c.adresse}
          </Text>
          <Text>
            Tel {c.telephone} — MF {c.matriculeFiscal}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Génère et télécharge le PDF du document. */
export async function downloadDocumentPDF(doc: SalesDocument, settings: AppSettings): Promise<void> {
  const blob = await pdf(<DocumentPDF doc={doc} settings={settings} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const prefix = doc.type === 'devis' ? 'Devis' : 'Facture';
  a.href = url;
  a.download = `${prefix}-${doc.numero || 'brouillon'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
