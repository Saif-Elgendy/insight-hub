import { Link } from 'react-router-dom';
import { Brain, Mail, Phone, MapPin, Facebook, Github, Instagram, Linkedin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';

const footerSections: {
  titleKey: TranslationKey;
  links: { labelKey: TranslationKey; href: string }[];
}[] = [
  {
    titleKey: 'footer.platform',
    links: [
      { labelKey: 'nav.courses', href: '/courses' },
      { labelKey: 'nav.specialists', href: '/specialists' },
      { labelKey: 'nav.library', href: '/resources' },
      { labelKey: 'footer.certificates', href: '/#certificates' },
    ],
  },
  {
    titleKey: 'footer.support',
    links: [
      { labelKey: 'footer.helpCenter', href: '/#consultations' },
      { labelKey: 'footer.faq', href: '/#consultations' },
      { labelKey: 'footer.contact', href: '/#consultations' },
      { labelKey: 'footer.privacy', href: '/' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { labelKey: 'footer.about', href: '/' },
      { labelKey: 'footer.team', href: '/specialists' },
      { labelKey: 'footer.careers', href: '/' },
      { labelKey: 'footer.partners', href: '/' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Github, href: 'https://github.com/Saif-Elgendy', label: 'GitHub' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/saif-mahmoud-elgendy', label: 'LinkedIn' },
];

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{t('brand.name')}</span>
            </Link>
            <p className="text-background/70 mb-6 max-w-sm">{t('footer.tagline')}</p>
            <div className="space-y-3 text-background/70">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <span>Saifelgendy495@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>01023863755</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                <span>{t('footer.location')}</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          {footerSections.map((section) => (
            <div key={section.titleKey}>
              <h4 className="font-bold text-lg mb-4">{t(section.titleKey)}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-background transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/70 text-sm">{t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
