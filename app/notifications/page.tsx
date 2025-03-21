"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CheckSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/page-transition";
import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationItem } from "@/components/notifications/notification-item";
import BottomNav from "@/components/bottom-nav";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, CheckCheck, Trash2, Clock, Calendar } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { useAppContext } from "@/lib/context/AppContext";

export default function NotificationsPage() {
  const { state, loadNotifications, markAsRead, markAllAsRead } = useNotifications();
  const { notifications, unreadCount, isLoading } = state;
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const router = useRouter();
  const { dispatch } = useAppContext();

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true);
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
  };

  // Marcar uma notificação como lida
  const markAsReadGlobal = async (id: string) => {
    try {
      if (dispatch) {
        dispatch({
          type: "MARK_NOTIFICATION_READ",
          payload: { id }
        });
      }
      
      toast.success("Notificação marcada como lida");
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      toast.error("Não foi possível marcar a notificação como lida");
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsReadGlobal = async () => {
    try {
      if (dispatch) {
        dispatch({
          type: "MARK_ALL_NOTIFICATIONS_READ"
        });
      }
      
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      toast.error("Não foi possível marcar todas as notificações como lidas");
    }
  };

  // Remover uma notificação
  const removeNotification = async (id: string) => {
    try {
      if (dispatch) {
        dispatch({
          type: "REMOVE_NOTIFICATION",
          payload: { id }
        });
      }
      
      toast.success("Notificação removida");
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
      toast.error("Não foi possível remover a notificação");
    }
  };

  // Obter o ícone baseado no tipo de notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "feeding":
        return <Clock className="h-5 w-5 text-primary" />;
      case "reminder":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "system":
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

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

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Notificações" showBackButton />
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Suas Notificações</h1>
            
            {notifications.filter(n => !n.isRead).length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsReadGlobal}
                className="flex items-center gap-2"
              >
                <CheckCheck size={16} />
                <span>Marcar todas como lidas</span>
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-muted rounded"></div>
                        <div className="h-3 w-1/2 bg-muted rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                Nenhuma notificação para exibir.
              </p>
              <Link href="/">
                <Button>Voltar para o Início</Button>
              </Link>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {notifications.map((notification) => (
                <motion.div key={notification.id} variants={itemVariants}>
                  <Card className={`hover:shadow-md transition-shadow ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{notification.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {notification.message}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt || new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2 gap-2">
                        {!notification.isRead && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsReadGlobal(notification.id)}
                            className="text-xs h-8"
                          >
                            <Check size={14} className="mr-1" />
                            Marcar como lida
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="text-xs text-destructive h-8"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
}
