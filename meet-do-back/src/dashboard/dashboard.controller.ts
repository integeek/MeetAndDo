import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, ForbiddenException, Req } from '@nestjs/common';
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
}
