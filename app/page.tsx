"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Cat, Clock, Utensils, BarChart3, Calendar, Users, PlusCircle } from "lucide-react";
import { useGlobalState } from "@/lib/context/global-state";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FeedingLogItem } from "@/components/feeding-log-item";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { getCatsByHouseholdId } from "@/lib/services/apiService";
import { useSession } from "next-auth/react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeedingDrawer } from "@/components/feeding-drawer";

const calculateProgress = (total: number, current: number) => {
  if (total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
};

export default function Home() {
  const { state } = useGlobalState();
  const router = useRouter();
  const { data: session } = useSession();
  const [todayFeedingCount, setTodayFeedingCount] = useState(0);
  const [scheduleCompletionRate, setScheduleCompletionRate] = useState(0);
  const [recentFeedingsData, setRecentFeedingsData] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!state.feedingLogs.length) return;

    // Calcular alimentações de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = state.feedingLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
    
    setTodayFeedingCount(todayLogs.length);

    // Preparar dados para o gráfico de alimentações recentes
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const recentData = last7Days.map(date => {
      const dayLogs = state.feedingLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === compareDate.getTime();
      });

      const totalFood = dayLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0);

      return {
        name: format(date, 'EEE', { locale: ptBR }),
        valor: totalFood
      };
    });

    setRecentFeedingsData(recentData);
  }, [state.feedingLogs]);

  useEffect(() => {
    // Calcular taxa de conclusão dos agendamentos
    const totalSchedules = state.schedules.length;
    const completedSchedules = state.schedules.filter(s => s.status === "completed").length;
    setScheduleCompletionRate(calculateProgress(totalSchedules, completedSchedules));
  }, [state.schedules]);

  const dashboardItems = [
    {
      title: "Gatos",
      value: state.cats.length,
      icon: <Cat className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-500",
      href: "/cats",
      empty: state.cats.length === 0,
    },
    {
      title: "Alimentações Hoje",
      value: todayFeedingCount,
      icon: <Utensils className="h-5 w-5" />,
      color: "bg-emerald-100 text-emerald-500",
      href: "/feedings",
      empty: todayFeedingCount === 0,
    },
    {
      title: "Agendamentos",
      value: state.schedules.length,
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-500",
      href: "/schedules",
      empty: state.schedules.length === 0,
    },
    {
      title: "Residências",
      value: state.households.length,
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-500",
      href: "/households",
      empty: state.households.length === 0,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const getLastFeedingLog = () => {
    if (state.feedingLogs.length === 0) return null;
    
    const lastLog = state.feedingLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    const cat = state.cats.find(cat => cat.id === lastLog.catId);
    
    return {
      ...lastLog,
      cat: cat ? {
        id: cat.id,
        name: cat.name,
        photoUrl: cat.photoUrl,
        householdId: cat.householdId,
        feeding_interval: cat.feeding_interval
      } : undefined
    };
  };

  const lastFeedingLog = getLastFeedingLog();

  const isNewUser = state.cats.length === 0 && state.feedingLogs.length === 0;

  if (isNewUser) {
    return (
      <div className="container px-4 py-8">
        <EmptyState
          icon={Cat}
          title="Bem-vindo ao MealTime!"
          description="Para começar, cadastre seu primeiro gato e comece a registrar as alimentações."
          actionLabel="Cadastrar Meu Primeiro Gato"
          actionHref="/cats/new"
          secondaryActionLabel="Ver Tutorial"
          secondaryActionOnClick={() => {
            localStorage.removeItem("onboarding-completed");
            document.body.style.overflow = "auto";
            document.body.classList.remove("overflow-hidden");
            window.location.reload();
          }}
          className="max-w-xl mx-auto my-12"
        />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold mb-6">Painel de Controle</h1>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardItems.map((item) => (
            <Link href={item.href} key={item.title} className="block">
              <Card className="h-full hover:shadow-md transition-all duration-300">
                <CardHeader className="py-4 px-5">
                  <div className={`p-2 rounded-full w-fit ${item.color}`}>
                    {item.icon}
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-5">
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <h3 className="text-2xl font-bold">{item.value}</h3>
                </CardContent>
                <CardFooter className="py-4 px-5">
                  <p className="text-xs text-muted-foreground">
                    {item.empty ? "Nenhum registro ainda" : "Ver detalhes →"}
                  </p>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Última Alimentação</CardTitle>
              <CardDescription>
                Detalhes da última alimentação registrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastFeedingLog ? (
                <div onClick={() => setIsDrawerOpen(true)} className="cursor-pointer">
                  <FeedingLogItem
                    log={{
                      ...lastFeedingLog,
                      createdAt: lastFeedingLog.timestamp,
                      cat: lastFeedingLog.cat ? {
                        ...lastFeedingLog.cat,
                        householdId: lastFeedingLog.cat.householdId || 0,
                        feeding_interval: lastFeedingLog.cat.feeding_interval || 0
                      } : undefined,
                      user: lastFeedingLog.user ? {
                        id: lastFeedingLog.user.id,
                        name: lastFeedingLog.user.name,
                        email: lastFeedingLog.user.email,
                        avatar: lastFeedingLog.user.avatar,
                        householdId: lastFeedingLog.user.households?.[0] ? parseInt(lastFeedingLog.user.households[0]) : null,
                        preferences: {
                          timezone: "America/Sao_Paulo",
                          language: "pt-BR",
                          notifications: {
                            pushEnabled: true,
                            emailEnabled: true,
                            feedingReminders: true,
                            missedFeedingAlerts: true,
                            householdUpdates: true
                          }
                        },
                        role: lastFeedingLog.user.role || "user"
                      } : undefined
                    }}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : (
                <EmptyState
                  icon={Utensils}
                  title="Nenhuma alimentação registrada"
                  description="Registre a primeira alimentação do seu gato para começar a acompanhar."
                  actionLabel="Registrar Alimentação"
                  actionHref="/feedings/new"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <FeedingDrawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          feedingLog={lastFeedingLog}
        />

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Alimentação</CardTitle>
              <CardDescription>
                Acompanhe padrões e dados sobre a alimentação dos seus gatos
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="h-48 w-full">
                {recentFeedingsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={recentFeedingsData}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        hide={true}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'transparent',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        formatter={(value) => [`${value}g de alimento`, '']}
                      />
                      <Bar 
                        dataKey="valor" 
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Sem dados para exibir</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/statistics">
                  Ver Estatísticas Completas
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
} 