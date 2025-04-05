"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Home, Lock, MoreVertical, Plus, Trash, Pencil, ExternalLink, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHousehold } from "@/lib/context/HouseholdContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { Household as HouseholdType, HouseholdMember } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import PageTransition from "@/components/page-transition";
import BottomNav from "@/components/bottom-nav";

// Empty state component (modified slightly)
function EmptyHouseholdsState() {
  return (
     <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/50 mt-8">
       <Users className="h-12 w-12 text-muted-foreground mb-4" />
       <h3 className="text-lg font-semibold mb-2">Nenhuma Residência</h3>
       <p className="text-muted-foreground mb-6 max-w-md">
         Você ainda não faz parte de nenhuma residência. Crie uma nova ou peça um convite para participar de uma existente.
       </p>
       <div className="flex gap-4">
          <Button asChild>
             <Link href="/households/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Criar Nova</span>
             </Link>
          </Button>
           {/* Add Join button if invite codes are implemented */}
           {/* <Button variant="outline" asChild>
               <Link href="/join">Entrar com Convite</Link>
           </Button> */}
       </div>
     </div>
   );
}

// Loading skeleton (keep as is or simplify)
function LoadingHouseholds() { 
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
 }

export default function HouseholdsPage() {
  const router = useRouter();
  const { state: householdState, dispatch: householdDispatch } = useHousehold();
  const { state: userState, dispatch: userDispatch } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation, state: loadingState } = useLoading();
  const { households, isLoading: isLoadingHouseholds, error: errorHouseholds } = householdState;
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { data: session, status } = useSession();
  const [householdToDelete, setHouseholdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = isLoadingUser || isLoadingHouseholds;
  const error = errorUser || errorHouseholds;

  const handleDeleteHousehold = async (id: string) => {
     if (!id) return;
     const opId = `delete-household-${id}`;
     addLoadingOperation({ id: opId, priority: 1, description: "Excluindo residência..." });
     setIsDeleting(true);
     const previousHouseholds = households;

    try {
      householdDispatch({ type: "DELETE_HOUSEHOLD", payload: id });

      const response = await fetch(`/api/households/${id}`, { method: 'DELETE' });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         householdDispatch({ type: "SET_HOUSEHOLDS", payload: previousHouseholds });
         throw new Error(errorData.error || 'Erro ao excluir residência');
      }

      if (String(currentUser?.householdId) === String(id)) {
          const nextPrimary = previousHouseholds.find(h => String(h.id) !== String(id))?.id || null;
          userDispatch({ 
              type: "SET_USER", 
              payload: currentUser ? { ...currentUser, householdId: nextPrimary } : null 
          });
          await session?.update({ user: { ...session.user, householdId: nextPrimary } });
      }

      toast.success("Residência excluída com sucesso");
      setHouseholdToDelete(null);

    } catch (error: any) {
      console.error("Erro ao excluir residência:", error);
      toast.error(`Erro ao excluir: ${error.message}`);
      if (previousHouseholds) { 
           householdDispatch({ type: "SET_HOUSEHOLDS", payload: previousHouseholds });
      } else {
           console.warn("Could not revert household deletion state: previous state unknown.");
      }
    } finally {
        setIsDeleting(false);
        removeLoadingOperation(opId);
    }
  };

  const isAdmin = useCallback((household: HouseholdType): boolean => {
     if (!currentUser?.id || !household) {
       console.log(`[isAdmin Check - ${household?.id}] Failed: Missing currentUser (${!currentUser}) or household (${!household})`);
       return false;
     }

     console.log(`[isAdmin Check - ${household.id}] Checking user ${currentUser.id} against owner ${household.owner?.id}`);

     // Check 1: Is the current user the owner of this household?
     if (household.owner?.id && String(household.owner.id) === String(currentUser.id)) {
         console.log(`[isAdmin Check - ${household.id}] SUCCESS: User ${currentUser.id} IS the owner.`);
         return true;
     }

     console.log(`[isAdmin Check - ${household.id}] Owner check failed. Checking members array...`);

     // Check 2: Fallback to checking the role in the members array
     if (!household.members) {
       console.log(`[isAdmin Check - ${household.id}] Failed: household.members array is missing.`);
       return false; 
     }

     const currentUserMember = household.members.find(
       member => String(member.userId) === String(currentUser.id)
     );

     if (!currentUserMember) {
       console.log(`[isAdmin Check - ${household.id}] Failed: User ${currentUser.id} not found in members array:`, household.members);
       return false;
     }

     console.log(`[isAdmin Check - ${household.id}] Found member: `, currentUserMember);
     const isAdminRole = currentUserMember?.role?.toLowerCase() === "admin";

     console.log(`[isAdmin Check - ${household.id}] Member role check result: ${isAdminRole}`);

     return isAdminRole;
  }, [currentUser]);

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

  if (status === "loading" || (status === "authenticated" && isLoading)) {
     return (
         <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
                <div className="p-4 pb-24">
                    <LoadingHouseholds />
                </div>
            </div>
         </PageTransition>
     );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  if (error) {
      return (
         <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
               <div className="p-4 pb-24">
                   <PageHeader
                       title="Minhas Residências"
                       description="Erro ao carregar residências"
                   />
                   <EmptyState title="Erro" description={error} icon={AlertTriangle} />
               </div>
                <BottomNav /> 
            </div>
         </PageTransition>
      );
  }
  
  const householdsToDisplay = households || [];

  return (
     <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
            <div className="p-4 pb-24">
                <PageHeader
                    title="Minhas Residências"
                    description="Gerencie as residências onde você cuida dos seus gatos"
                    actionIcon={<Plus className="h-4 w-4" />}
                    actionLabel="Nova Residência"
                    actionHref="/households/new"
                />

                {householdsToDisplay.length === 0 ? (
                    <EmptyHouseholdsState />
                ) : (
                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {householdsToDisplay.map((household) => {
                            const userIsAdmin = isAdmin(household);
                            const memberCount = household.members?.length || 0;
                            const catCount = household.cats?.length || 0; 

                            console.log(`[Render Check - ${household.id}] userIsAdmin value:`, userIsAdmin);

                            return (
                                <motion.div key={household.id} variants={itemVariants}>
                                    <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                   <Home className="h-5 w-5 text-primary flex-shrink-0"/>
                                                   <span className="truncate">{household.name}</span>
                                                </CardTitle>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                            <span className="sr-only">Opções</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/households/${household.id}`} className="cursor-pointer">
                                                               <ExternalLink className="mr-2 h-4 w-4" /> Ver Detalhes
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {console.log(`[Render Check - ${household.id}] userIsAdmin value:`, userIsAdmin)}
                                                        {userIsAdmin && (
                                                            <>
                                                                <DropdownMenuItem asChild>
                                                                     <Link href={`/households/${household.id}/edit`} className="cursor-pointer">
                                                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <AlertDialog open={householdToDelete === String(household.id)} onOpenChange={(open) => !open && setHouseholdToDelete(null)}>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600 cursor-pointer"
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            onClick={() => setHouseholdToDelete(String(household.id))}
                                                                        >
                                                                            <Trash className="mr-2 h-4 w-4" /> Excluir
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Excluir Residência?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Tem certeza que deseja excluir a residência "{household.name}"? Todos os membros, gatos e dados associados serão removidos permanentemente.
                                                                                Esta ação não pode ser desfeita.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel onClick={() => setHouseholdToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => handleDeleteHousehold(String(household.id))}
                                                                                disabled={isDeleting}
                                                                                className="bg-destructive hover:bg-destructive/90"
                                                                            >
                                                                                {isDeleting && householdToDelete === String(household.id) ? <Loading text="Excluindo..." size="sm" /> : "Excluir"}
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <CardDescription className="text-xs pt-1 flex items-center">
                                                {/* Display Admin badge if the current user is the admin */}
                                                {userIsAdmin && (
                                                    <Badge variant="secondary">
                                                        Admin
                                                    </Badge>
                                                )}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <div className="text-sm text-muted-foreground flex flex-col gap-1">
                                                <span className="flex items-center"><Users className="h-4 w-4 mr-2" /> {memberCount} Membro(s)</span>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button variant="outline" className="w-full" asChild>
                                                 <Link href={`/households/${household.id}`}>Gerenciar</Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
            <BottomNav />
        </div>
     </PageTransition>
  );
} 