import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface PrismaError extends Error {
  code?: string;
}

// GET /api/cats - Listar todos os gatos (filtragem opcional por householdId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    const where = householdId 
      ? { householdId: parseInt(householdId) } 
      : {};

    const cats = await prisma.cat.findMany({
      where,
      select: {
        id: true,
        name: true,
        photoUrl: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(cats);
  } catch (error) {
    console.error('Erro ao buscar gatos:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
}

// POST /api/cats - Criar um novo perfil de gato
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const {
      name,
      photoUrl,
      birthdate,
      weight,
      restrictions,
      notes,
      householdId,
      feeding_interval,
      portion
    } = await request.json();

    if (!name || !householdId) {
      return NextResponse.json(
        { error: 'Nome e ID do domicílio são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário pertence ao domicílio
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(session.user.id),
        householdId: householdId
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }

    // Verificar se o domicílio existe
    const household = await prisma.household.findUnique({
      where: { id: householdId }
    });

    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { status: 404 }
      );
    }

    // Validar o intervalo de alimentação
    let parsedInterval = 8; // Valor padrão
    if (feeding_interval) {
      const interval = parseInt(feeding_interval);
      if (isNaN(interval) || interval < 1 || interval > 24) {
        return NextResponse.json(
          { error: 'O intervalo de alimentação deve estar entre 1 e 24 horas' },
          { status: 400 }
        );
      }
      parsedInterval = interval;
    }

    // Criar o perfil do gato
    const catData = {
      name,
      photoUrl: photoUrl || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      weight: weight ? parseFloat(String(weight)) : null,
      restrictions: restrictions || null,
      notes: notes || null,
      householdId,
      feedingInterval: parsedInterval,
      portion_size: portion ? parseFloat(String(portion)) : null,
      userId: parseInt(session.user.id)
    };

    const cat = await prisma.cat.create({
      data: catData
    });

    return NextResponse.json(cat, { status: 201 });
  } catch (error: PrismaError) {
    console.error('Erro ao criar perfil de gato:', error);
    
    // Verificar se é um erro do Prisma
    if (error.code) {
      // Erros específicos do Prisma
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Já existe um gato com essas informações' },
          { status: 400 }
        );
      } else if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Referência inválida a outro registro' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o perfil do gato' },
      { status: 500 }
    );
  }
} 