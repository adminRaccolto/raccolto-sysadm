import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface CreateFuncionarioDto {
  nome: string;
  documento?: string;
  tipoDocumento?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  sexo?: string;
  fotoUrl?: string;
  cargo?: string;
  vinculo?: string;
  salario?: number;
  dataAdmissao?: string;
  dataDemissao?: string;
  dataNascimento?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contaBancariaNome?: string;
  contaBancariaAgencia?: string;
  contaBancariaConta?: string;
  contaBancariaBanco?: string;
  contaBancariaPix?: string;
  usuarioId?: string;
  fornecedorId?: string;
  ativo?: boolean;
  observacoes?: string;
}

@Injectable()
export class FuncionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  findAll(empresaId: string, apenasAtivos?: boolean) {
    return this.prisma.funcionario.findMany({
      where: { empresaId, ...(apenasAtivos ? { ativo: true } : {}) },
      include: { fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const f = await this.prisma.funcionario.findFirst({
      where: { id, empresaId },
      include: { fornecedor: true },
    });
    if (!f) throw new BadRequestException('Funcionário não encontrado.');
    return f;
  }

  async uploadFoto(empresaId: string, id: string, file: Express.Multer.File) {
    await this.findOne(empresaId, id);
    const url = await this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype, 'funcionarios');
    return this.prisma.funcionario.update({ where: { id }, data: { fotoUrl: url }, select: { id: true, fotoUrl: true } });
  }

  create(empresaId: string, data: CreateFuncionarioDto) {
    return this.prisma.funcionario.create({
      data: {
        empresaId,
        nome: data.nome.trim(),
        documento: data.documento?.trim() || null,
        tipoDocumento: data.tipoDocumento || null,
        cpf: data.cpf?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        telefone: data.telefone?.trim() || null,
        sexo: data.sexo || null,
        fotoUrl: data.fotoUrl || null,
        cargo: data.cargo?.trim() || null,
        vinculo: data.vinculo || 'CLT',
        salario: data.salario ?? null,
        dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
        dataDemissao: data.dataDemissao ? new Date(data.dataDemissao) : null,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
        logradouro: data.logradouro?.trim() || null,
        numero: data.numero?.trim() || null,
        complemento: data.complemento?.trim() || null,
        bairro: data.bairro?.trim() || null,
        cidade: data.cidade?.trim() || null,
        estado: data.estado?.trim() || null,
        cep: data.cep?.trim() || null,
        contaBancariaNome: data.contaBancariaNome?.trim() || null,
        contaBancariaAgencia: data.contaBancariaAgencia?.trim() || null,
        contaBancariaConta: data.contaBancariaConta?.trim() || null,
        contaBancariaBanco: data.contaBancariaBanco?.trim() || null,
        contaBancariaPix: data.contaBancariaPix?.trim() || null,
        usuarioId: data.usuarioId || null,
        fornecedorId: data.fornecedorId || null,
        ativo: data.ativo ?? true,
        observacoes: data.observacoes?.trim() || null,
      },
      include: { fornecedor: { select: { id: true, razaoSocial: true } } },
    });
  }

  async update(empresaId: string, id: string, data: Partial<CreateFuncionarioDto>) {
    await this.findOne(empresaId, id);
    return this.prisma.funcionario.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.documento !== undefined ? { documento: data.documento?.trim() || null } : {}),
        ...(data.tipoDocumento !== undefined ? { tipoDocumento: data.tipoDocumento || null } : {}),
        ...(data.cpf !== undefined ? { cpf: data.cpf?.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim().toLowerCase() || null } : {}),
        ...(data.telefone !== undefined ? { telefone: data.telefone?.trim() || null } : {}),
        ...(data.sexo !== undefined ? { sexo: data.sexo || null } : {}),
        ...(data.fotoUrl !== undefined ? { fotoUrl: data.fotoUrl || null } : {}),
        ...(data.cargo !== undefined ? { cargo: data.cargo?.trim() || null } : {}),
        ...(data.vinculo !== undefined ? { vinculo: data.vinculo } : {}),
        ...(data.salario !== undefined ? { salario: data.salario } : {}),
        ...(data.dataAdmissao !== undefined ? { dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null } : {}),
        ...(data.dataDemissao !== undefined ? { dataDemissao: data.dataDemissao ? new Date(data.dataDemissao) : null } : {}),
        ...(data.dataNascimento !== undefined ? { dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null } : {}),
        ...(data.logradouro !== undefined ? { logradouro: data.logradouro?.trim() || null } : {}),
        ...(data.numero !== undefined ? { numero: data.numero?.trim() || null } : {}),
        ...(data.complemento !== undefined ? { complemento: data.complemento?.trim() || null } : {}),
        ...(data.bairro !== undefined ? { bairro: data.bairro?.trim() || null } : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade?.trim() || null } : {}),
        ...(data.estado !== undefined ? { estado: data.estado?.trim() || null } : {}),
        ...(data.cep !== undefined ? { cep: data.cep?.trim() || null } : {}),
        ...(data.contaBancariaNome !== undefined ? { contaBancariaNome: data.contaBancariaNome?.trim() || null } : {}),
        ...(data.contaBancariaAgencia !== undefined ? { contaBancariaAgencia: data.contaBancariaAgencia?.trim() || null } : {}),
        ...(data.contaBancariaConta !== undefined ? { contaBancariaConta: data.contaBancariaConta?.trim() || null } : {}),
        ...(data.contaBancariaBanco !== undefined ? { contaBancariaBanco: data.contaBancariaBanco?.trim() || null } : {}),
        ...(data.contaBancariaPix !== undefined ? { contaBancariaPix: data.contaBancariaPix?.trim() || null } : {}),
        ...(data.usuarioId !== undefined ? { usuarioId: data.usuarioId || null } : {}),
        ...(data.fornecedorId !== undefined ? { fornecedorId: data.fornecedorId || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes?.trim() || null } : {}),
      },
      include: { fornecedor: { select: { id: true, razaoSocial: true } } },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    await this.prisma.funcionario.delete({ where: { id } });
    return { ok: true };
  }
}
