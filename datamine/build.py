#!/usr/bin/env python3
"""Build datamine.html from datamine.src.html.

Inlines the stylesheets, the page script and every "@asset:<file>" token
(as a data URI), and renders the FAQ and its FAQPage schema from one list
so the visible answers and the structured data can never drift apart.
"""
import base64
import json
import mimetypes
import pathlib
import re
from html import escape

HERE = pathlib.Path(__file__).resolve().parent

# The first answer is the canonical definition, verbatim (copy deck D2-2).
FAQ = [
    ("What is AlmaConnect Data Mine?",
     "AlmaConnect Data Mine is an alumni employment data platform for advancement services and prospect research teams. It identifies everyone who lists an institution on their public professional profile, matches them to that institution’s constituent records with a unique ID, and delivers verified job changes, promotions and employer updates on a weekly, monthly or quarterly cycle — into a searchable directory or straight into Raiser’s Edge NXT or Salesforce."),
    ("How often is the data updated?",
     "You choose — AlmaConnect Data Mine refreshes weekly, monthly or quarterly depending on your subscription. After each refresh you receive a delta of everyone who changed job, title or employer, rather than a full file to re-match. Most institutions choose monthly. Providers who deliver a periodic data file typically send one every quarter."),
    ("How do you match records to our database?",
     "Matching runs on several attributes at once — name plus employer, location, graduation year and spouse — and every proposed match carries a confidence score. Only 100% matches are applied automatically; everything below is surfaced for a one-time review. Unmatched records are shown to you rather than hidden, and every record returns with your own unique ID."),
    ("Where does the data come from?",
     "AlmaConnect Data Mine is built from public, self-reported professional profiles. That means coverage is strong for working-age alumni and weaker for people who no longer maintain a profile — commonly the most senior. Institutions running AlmaConnect News alongside it catch those appointments through news coverage instead."),
    ("Which CRMs does AlmaConnect Data Mine write to?",
     "AlmaConnect Data Mine writes to Blackbaud Raiser’s Edge NXT through the SKY API, to Salesforce — including Ascend, AffiniQuest/Advancement RM and Nonprofit Success Pack — and to Ellucian. Job changes add the new employer as primary and mark the previous one as former, with dates. Nothing is overwritten, and every update waits for approval."),
    ("Can you find email addresses and phone numbers too?",
     "Yes, through Data Enrichment, an add-on to AlmaConnect Data Mine. We search for business emails, phone numbers and addresses on the records you nominate, automatically and manually. You are charged only for records where we find something — typically around half of those searched, of which roughly three in four prove current."),
    ("Is AlmaConnect Data Mine GDPR compliant?",
     "Yes. AlmaConnect Data Mine is GDPR compliant and certified under the EU–US Data Privacy Framework and the UK–US Data Bridge. AlmaConnect also holds SOC 2 Type II and ISO 27001. We ask only for names, IDs, education and employment history — never dates of birth, gender or giving history — and delete your data within 30 days of contract termination."),
]

# Cross-link to News from the FAQ answer about data sources (SEO spec).
NEWS_URL = "https://claude.ai/artifact/4FuQxzHfutUX6ecVaou7SR?sk=cQLm4m7bDBHOdw-1ZUxLBw"
PLUS = '<svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'


def faq_html():
    out = []
    for i, (q, a) in enumerate(FAQ):
        body = escape(a, quote=False)
        if i == 3:
            body = body.replace("AlmaConnect News", f'<a href="{NEWS_URL}" target="_blank" rel="noopener">AlmaConnect News</a>', 1)
        is_open = i == 0
        out.append(
            f'''      <div class="faq__row{' is-open' if is_open else ''}">
        <h3><button class="faq__q" type="button" aria-expanded="{str(is_open).lower()}" aria-controls="faq-{i}">{escape(q)}
          {PLUS}</button></h3>
        <div class="faq__a" id="faq-{i}" role="region"><div><p class="t-body">{body}</p></div></div>
      </div>
''')
    return "\n".join(out)


def jsonld():
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "@id": "https://news.almaconnect.com/data-mine#software",
                "name": "AlmaConnect Data Mine",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "url": "https://news.almaconnect.com/data-mine",
                "description": FAQ[0][1],
                "offers": {"@type": "AggregateOffer", "lowPrice": "4500", "priceCurrency": "USD"},
                "provider": {"@id": "https://almaconnect.com/#organization"},
            },
            {
                "@type": "Organization",
                "@id": "https://almaconnect.com/#organization",
                "name": "AlmaConnect",
                "url": "https://almaconnect.com/",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "AlmaConnect", "item": "https://almaconnect.com/"},
                    {"@type": "ListItem", "position": 2, "name": "AlmaConnect Data Mine", "item": "https://news.almaconnect.com/data-mine"},
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in FAQ
                ],
            },
        ],
    }
    return json.dumps(graph, ensure_ascii=False, indent=2)


def data_uri(name):
    path = HERE / "assets" / name
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix == ".svg":
        mime = "image/svg+xml"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def main():
    src = (HERE / "datamine.src.html").read_text()
    src = re.sub(r"@@CSS:([\w.-]+)@@", lambda m: (HERE / m.group(1)).read_text().rstrip(), src)
    src = re.sub(r"@@JS:([\w.-]+)@@", lambda m: (HERE / m.group(1)).read_text().rstrip(), src)
    src = src.replace("@@FAQ@@", faq_html().rstrip())
    src = src.replace("@@JSONLD@@", jsonld())
    cache = {}
    src = re.sub(r"@asset:([\w.-]+)", lambda m: cache.setdefault(m.group(1), data_uri(m.group(1))), src)
    leftover = re.findall(r"@@[A-Z:]+|@asset:", src)
    assert not leftover, leftover
    out = HERE / "datamine.html"
    out.write_text(src)
    print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
