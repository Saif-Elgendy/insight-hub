import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Brain, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

const navLinks = [
  { label: 'الرئيسية', href: '/', isRoute: true },
  { label: 'الكورسات', href: '/courses', isRoute: true },
  { label: 'الجلسات المباشرة', href: '#live-sessions', isRoute: false },
  { label: 'الاستشارات', href: '#consultations', isRoute: false },
  { label: 'الشهادات', href: '#certificates', isRoute: false },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { isDoctor } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">نفسي</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              link.isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : user ? (
              <>
                <NotificationsDropdown />
                {isDoctor && (
                  <Button variant="ghost" asChild>
                    <Link to="/doctor-dashboard" className="gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      لوحة التحكم
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" asChild>
                  <Link to="/profile" className="gap-2">
                    <User className="w-4 h-4" />
                    حسابي
                  </Link>
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 ml-2" />
                  خروج
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">تسجيل الدخول</Link>
                </Button>
                <Button variant="default" asChild>
                  <Link to="/auth">ابدأ الآن</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-foreground"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                )
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {user ? (
                  <>
                    {isDoctor && (
                      <Button variant="ghost" asChild className="w-full" onClick={() => setIsOpen(false)}>
                        <Link to="/doctor-dashboard" className="gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          لوحة التحكم
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" asChild className="w-full" onClick={() => setIsOpen(false)}>
                      <Link to="/profile" className="gap-2">
                        <User className="w-4 h-4" />
                        حسابي
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 ml-2" />
                      تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="w-full" onClick={() => setIsOpen(false)}>
                      <Link to="/auth">تسجيل الدخول</Link>
                    </Button>
                    <Button variant="default" asChild className="w-full" onClick={() => setIsOpen(false)}>
                      <Link to="/auth">ابدأ الآن</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
