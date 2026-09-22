export type Service = {
  id: string;
  index: string;
  title: string;
  short: string;
  description: string;
  items: string[];
};

export const services: Service[] = [
  {
    id: "ai-automation",
    index: "01",
    title: "AI Automation",
    short: "KI-gestützte Geschäftsprozesse, Assistenten und Dokumenten-Workflows.",
    description:
      "KI wird dort eingesetzt, wo sie einen messbaren Beitrag im Prozess leistet – nicht als Selbstzweck. Der Fokus liegt auf stabilen, nachvollziehbaren Abläufen mit klaren Übergabepunkten.",
    items: [
      "KI-gestützte Geschäftsworkflows",
      "KI-Assistenten für interne und externe Aufgaben",
      "Dokumenten- und Informationsworkflows",
      "Prozessautomatisierung mit KI-Komponenten",
    ],
  },
  {
    id: "n8n-automation",
    index: "02",
    title: "n8n Automation",
    short: "Workflow-Orchestrierung, API-Integrationen und interne Abläufe.",
    description:
      "n8n verbindet bestehende Systeme zu durchgängigen Abläufen. Datenflüsse werden orchestriert, überwacht und dokumentiert – ohne dass Ihr Team bestehende Tools aufgeben muss.",
    items: [
      "Workflow-Orchestrierung",
      "API-Integrationen",
      "Interne Operations-Workflows",
      "CRM- und Kommunikationsworkflows",
    ],
  },
  {
    id: "customer-service-automation",
    index: "03",
    title: "Customer Service Automation",
    short: "Für Unternehmen mit hohem Aufkommen schriftlicher oder telefonischer Anfragen.",
    description:
      "Aus über fünf Jahren operativer Kundenservice-Erfahrung entstehen Systeme, die Anfragen strukturieren, korrekt weiterleiten und Mitarbeitende entlasten – bei voller Kontrolle über Eskalationen.",
    items: [
      "Klassifizierung eingehender Anfragen",
      "Strukturierte Fallaufnahme",
      "Automatisiertes Routing",
      "KI-unterstützte Antwortvorschläge",
      "CRM-Aktualisierungen",
      "Follow-up- und Eskalationsworkflows",
      "Wissensgestützter Kundenservice",
    ],
  },
  {
    id: "online-shops",
    index: "04",
    title: "High-Automation Online Shops",
    short: "Konzeption und Entwicklung von Online-Shops mit hohem Automatisierungspotenzial.",
    description:
      "Der Shop ist nur die Oberfläche. Entscheidend ist, was dahinter automatisiert läuft: Bestellungen, Kommunikation, Produktpflege und Operations werden von Anfang an als System gedacht.",
    items: [
      "Bestell- und Auftragsabwicklung",
      "Kundenkommunikation",
      "Produkt-Workflows",
      "CRM und Benachrichtigungen",
      "Operations und Integrationen",
      "KI-Unterstützung im Shop-Betrieb",
    ],
  },
  {
    id: "custom-applications",
    index: "05",
    title: "Custom Applications",
    short: "Individuelle Webanwendungen, entwickelt um ein konkretes Geschäftsproblem.",
    description:
      "Wenn Standardsoftware nicht passt: fokussierte Webanwendungen mit klarem Zweck, sauberer Datenhaltung und einer Oberfläche, die im Arbeitsalltag funktioniert.",
    items: [
      "Interne Tools und Fachanwendungen",
      "Prozessgetriebene Oberflächen",
      "Datenmodell und Schnittstellen",
      "Iterative Weiterentwicklung",
    ],
  },
  {
    id: "business-platforms",
    index: "06",
    title: "Custom Business Platforms",
    short: "Komplexere B2B-Plattformen, Dashboards, Portale und operative Systeme.",
    description:
      "Plattformen, die mehrere Rollen, Prozesse und Datenquellen zusammenführen – mit Architektur, die auf Wachstum und Automatisierung ausgelegt ist.",
    items: [
      "B2B-Plattformen und Portale",
      "Operative Dashboards",
      "Rollen- und Rechtekonzepte",
      "Automatisierte Betriebslogik",
    ],
  },
];
