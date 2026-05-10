import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /* ----------------------------------------------------------------
     POST /contact
     Envoi d'un message de contact (public)
     ---------------------------------------------------------------- */
  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  /* ----------------------------------------------------------------
     GET /contact/mes-messages?email=...
     Messages d'un utilisateur par email (public)
     ---------------------------------------------------------------- */
  @Get('mes-messages')
  mesMessages(@Query('email') email: string) {
    if (!email || !email.includes('@')) return [];
    return this.contactService.findByEmail(email);
  }

  /* ----------------------------------------------------------------
     GET /contact
     Liste des messages de contact (admin)
     ---------------------------------------------------------------- */
  @Get()
  findAll(@Query() filters: FilterContactDto) {
    return this.contactService.findAll(filters);
  }

  /* ----------------------------------------------------------------
     GET /contact/stats
     Statistiques pour le dashboard admin
     ---------------------------------------------------------------- */
  @Get('stats')
  getStats() {
    return this.contactService.getStats();
  }

  /* ----------------------------------------------------------------
     GET /contact/:id
     Détail d'un message (admin) — marque comme lu automatiquement
     ---------------------------------------------------------------- */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.findOne(id);
  }

  /* ----------------------------------------------------------------
     PATCH /contact/:id/reply
     Enregistrer une réponse admin
     ---------------------------------------------------------------- */
  @Patch(':id/reply')
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyContactDto,
  ) {
    return this.contactService.reply(id, dto);
  }

  /* ----------------------------------------------------------------
     PATCH /contact/:id/suivi
     Ajouter un message de suivi utilisateur (public)
     ---------------------------------------------------------------- */
  @Patch(':id/suivi')
  ajouterSuivi(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string; nom: string },
  ) {
    return this.contactService.ajouterSuivi(id, body.message, body.nom);
  }

  /* ----------------------------------------------------------------
     PATCH /contact/:id/lu
     Marquer manuellement comme lu
     ---------------------------------------------------------------- */
  @Patch(':id/lu')
  marquerLu(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.marquerLu(id);
  }

  /* ----------------------------------------------------------------
     GET /contact/count-non-lus
     Nombre de messages non lus — badge sidebar admin
     ---------------------------------------------------------------- */
  @Get('count-non-lus')
  countNonLus() {
    return this.contactService.countNonLus();
  }

  /* ----------------------------------------------------------------
     PATCH /contact/marquer-tous-lus
     Marquer tous les messages comme lus
     ---------------------------------------------------------------- */
  @Patch('marquer-tous-lus')
  marquerTousLus() {
    return this.contactService.marquerTousLus();
  }

  /* ----------------------------------------------------------------
     DELETE /contact/:id
     Supprimer un message (admin)
     ---------------------------------------------------------------- */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.remove(id);
  }
}
