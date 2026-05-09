import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import JwtAuthenticationGuard from '../authentication/guard/jwt-authentication.guard';
import type RequestWithUser from '../authentication/requestWithUser.interface';

@Controller('dashboard')
@UseGuards(JwtAuthenticationGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  getAdminDashboard(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getAdminStats();
  }

  @Get('user')
  getUserDashboard(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'user') {
      throw new ForbiddenException('Accès réservé aux utilisateurs.');
    }
    return this.dashboardService.getUserStats(req.user.id);
  }

  @Get('publisher')
  getPublisherDashboard(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'publisher') {
      throw new ForbiddenException('Accès réservé aux éditeurs.');
    }
    return this.dashboardService.getPublisherStats(req.user.id);
  }

  @Get('activites')
  getActivites(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.getActivitesUtilisateur(req.user.id);
  }

  @Get('favoris')
  getFavoris(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.getFavoris(req.user.id);
  }

  @Post('favoris/:id')
  ajouterFavori(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.ajouterFavori(req.user.id, Number(id));
  }

  @Delete('favoris/:id')
  retirerFavori(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.retirerFavori(req.user.id, Number(id));
  }

  @Get('explorer')
  getExplorer(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() === 'admin') {
      throw new ForbiddenException('Non disponible pour les administrateurs.');
    }
    return this.dashboardService.getExplorer();
  }

  @Get('historique')
  getHistorique(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.getHistorique(req.user.id);
  }

  @Patch('historique/:id/rating')
  raterActivite(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { rating: string | null },
  ) {
    if ((req.user.role || '').toLowerCase() === 'admin') throw new ForbiddenException();
    return this.dashboardService.raterActivite(req.user.id, Number(id), body.rating);
  }

  @Get('conversations')
  getConversations(@Req() req: RequestWithUser) {
    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin') throw new ForbiddenException('Non disponible pour les administrateurs.');
    return this.dashboardService.getConversations(req.user.id);
  }

  @Get('admin/publisher-requests')
  getPublisherRequests(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getPublisherRequests();
  }

  @Patch('admin/approve-publisher/:id')
  approvePublisher(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.approvePublisher(Number(id));
  }

  @Patch('admin/reject-publisher/:id')
  rejectPublisher(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.rejectPublisher(Number(id));
  }

  // ----------------------------------------------------------------
  //  ADMIN — GESTION DES UTILISATEURS
  // ----------------------------------------------------------------

  @Get('admin/users')
  getAdminUsers(@Req() req: RequestWithUser, @Query('search') search?: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getAdminUsers(search);
  }

  @Patch('admin/users/:id/role')
  updateUserRole(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.updateUserRole(Number(id), body.role);
  }

  @Delete('admin/users/:id')
  deleteAdminUser(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.deleteAdminUser(Number(id));
  }

  // ----------------------------------------------------------------
  //  ADMIN — MESSAGES DE CONTACT
  // ----------------------------------------------------------------

  @Get('admin/contact-messages')
  getContactMessages(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getContactMessages();
  }

  @Post('admin/contact-messages/:id/reply')
  replyToContactMessage(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { reply: string },
  ) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.replyToContactMessage(id, body.reply);
  }

  @Delete('admin/contact-messages/:id')
  deleteContactMessage(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.deleteContactMessage(Number(id));
  }

  // ----------------------------------------------------------------
  //  ADMIN — SIGNALEMENTS
  // ----------------------------------------------------------------

  @Get('admin/reports/users')
  getReportedUsers(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getReportedUsers();
  }

  @Patch('admin/reports/users/:id/block')
  blockUser(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.blockUser(Number(id));
  }

  @Delete('admin/reports/:id')
  removeReport(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.removeReport(Number(id));
  }

  @Get('admin/reports/activities')
  getReportedActivities(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getReportedActivities();
  }

  // ----------------------------------------------------------------
  //  ADMIN — THÈMES
  // ----------------------------------------------------------------

  @Get('admin/themes')
  getThemes(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getThemes();
  }

  @Post('admin/themes')
  addTheme(
    @Req() req: RequestWithUser,
    @Body() body: { category: string; theme: string },
  ) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.addTheme(body.category, body.theme);
  }

  @Delete('admin/themes')
  removeTheme(
    @Req() req: RequestWithUser,
    @Body() body: { category: string; theme: string },
  ) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.removeTheme(body.category, body.theme);
  }

  // ----------------------------------------------------------------
  //  ADMIN — BLOQUER / DÉBLOQUER UN UTILISATEUR
  // ----------------------------------------------------------------

  @Patch('admin/users/:id/toggle-block')
  toggleBlockUser(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { block: boolean },
  ) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.toggleBlockUser(Number(id), body.block);
  }

  // ----------------------------------------------------------------
  //  ADMIN — DÉSACTIVER UNE ACTIVITÉ SIGNALÉE
  // ----------------------------------------------------------------

  @Patch('admin/activities/:id/disable')
  disableActivity(@Req() req: RequestWithUser, @Param('id') id: string) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.disableActivity(Number(id));
  }

  // ----------------------------------------------------------------
  //  ADMIN — TRAFIC HEBDOMADAIRE RÉEL
  // ----------------------------------------------------------------

  @Get('admin/traffic')
  getTraffic(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getTrafficHebdomadaire();
  }

  // ----------------------------------------------------------------
  //  ADMIN — ACTIVITÉ RÉCENTE
  // ----------------------------------------------------------------

  @Get('admin/recent-activity')
  getRecentActivity(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.dashboardService.getActiviteRecente();
  }

  // ----------------------------------------------------------------
  //  PUBLISHER — COMPTEUR RÉSERVATIONS (notifications)
  // ----------------------------------------------------------------

  @Get('publisher/reservations-count')
  getPublisherReservationsCount(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'publisher') {
      throw new ForbiddenException('Accès réservé aux éditeurs.');
    }
    return this.dashboardService.getPublisherReservationsCount(req.user.id);
  }

  // ----------------------------------------------------------------
  //  PUBLISHER — ACTIVITÉS CRÉÉES
  // ----------------------------------------------------------------

  @Get('publisher/activites')
  getPublisherActivites(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'publisher') {
      throw new ForbiddenException('Accès réservé aux éditeurs.');
    }
    return this.dashboardService.getPublisherActivites(req.user.id);
  }

  // ----------------------------------------------------------------
  //  PUBLISHER — HISTORIQUE DES RÉSERVATIONS REÇUES
  // ----------------------------------------------------------------

  @Get('publisher/historique')
  getPublisherHistorique(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'publisher') {
      throw new ForbiddenException('Accès réservé aux éditeurs.');
    }
    return this.dashboardService.getPublisherHistoriqueReservations(req.user.id);
  }

  // ----------------------------------------------------------------
  //  PUBLISHER — STATISTIQUES DÉTAILLÉES
  // ----------------------------------------------------------------

  @Get('publisher/statistiques')
  getPublisherStatistiques(@Req() req: RequestWithUser) {
    if ((req.user.role || '').toLowerCase() !== 'publisher') {
      throw new ForbiddenException('Accès réservé aux éditeurs.');
    }
    return this.dashboardService.getPublisherStatistiques(req.user.id);
  }
}
