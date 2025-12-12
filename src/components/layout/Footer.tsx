import { Brain, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const footerLinks = {
  platform: {
    title: 'المنصة',
    links: [
      { label: 'الكورسات', href: '#courses' },
      { label: 'الجلسات المباشرة', href: '#live-sessions' },
      { label: 'الاستشارات', href: '#consultations' },
      { label: 'الشهادات', href: '#certificates' },
    ],
  },
  support: {
    title: 'الدعم',
    links: [
      { label: 'مركز المساعدة', href: '#' },
      { label: 'الأسئلة الشائعة', href: '#' },
      { label: 'تواصل معنا', href: '#' },
      { label: 'سياسة الخصوصية', href: '#' },
    ],
  },
  company: {
    title: 'الشركة',
    links: [
      { label: 'من نحن', href: '#' },
      { label: 'فريق العمل', href: '#' },
      { label: 'وظائف', href: '#' },
      { label: 'الشراكات', href: '#' },
    ],
  },
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">نفسي</span>
            </a>
            <p className="text-background/70 mb-6 max-w-sm">
              منصة متخصصة في الصحة النفسية تقدم كورسات، جلسات مباشرة،
              واستشارات فردية مع أفضل المختصين.
            </p>
            <div className="space-y-3 text-background/70">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <span>info@nafsi.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>+966 50 000 0000</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                <span>الرياض، المملكة العربية السعودية</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-lg mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-background transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/70 text-sm">
            © 2024 نفسي. جميع الحقوق محفوظة.
          </p>
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
