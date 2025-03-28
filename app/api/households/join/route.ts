import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST /api/households/join - Entrar em um domicílio usando um código de convite
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validar dados
    if (!body.inviteCode || typeof body.inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Código de convite é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar o domicílio pelo código de convite
    const household = await prisma.household.findUnique({
      where: { inviteCode: body.inviteCode },
      include: {
        users: true
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Código de convite inválido' },
        { status: 404 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    
    // Verificar se o usuário já pertence ao domicílio
    const userAlreadyInHousehold = household.users.some(user => user.id === userId);
    
    if (userAlreadyInHousehold) {
      return NextResponse.json(
        { error: 'Você já pertence a este domicílio' },
        { status: 400 }
      );
    }
    
    // Adicionar usuário ao domicílio como membro
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        householdId: household.id,
        role: 'member' // Novos usuários sempre entram como membros
      }
    });
    
    // Buscar o domicílio atualizado com todos os membros
    const updatedHousehold = await prisma.household.findUnique({
      where: { id: household.id },
      include: {
        users: true,
        cats: true
      }
    });
    
    if (!updatedHousehold) {
      return NextResponse.json(
        { error: 'Erro ao buscar domicílio atualizado' },
        { status: 500 }
      );
    }
    
    // Formatar os dados para a resposta
    const formattedHousehold = {
      id: updatedHousehold.id.toString(),
      name: updatedHousehold.name,
      inviteCode: updatedHousehold.inviteCode,
      members: updatedHousehold.users.map(user => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isCurrentUser: user.id === userId
      })),
      cats: updatedHousehold.cats.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        photoUrl: cat.photoUrl
      }))
    };
    
    return NextResponse.json(formattedHousehold);
  } catch (error) {
    console.error('Erro ao entrar no domicílio:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao entrar no domicílio' },
      { status: 500 }
    );
  }
} 