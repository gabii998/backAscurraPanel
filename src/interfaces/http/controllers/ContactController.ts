import type { Request, Response } from "express";
import type { CreateContactRequest } from "../../../application/use-cases/CreateContactRequest";
import type { ListContactRequests } from "../../../application/use-cases/ListContactRequests";
import type { UpdateContactRequestStatus } from "../../../application/use-cases/UpdateContactRequestStatus";
import type { ContactRequestStatus } from "../../../domain/entities/ContactRequest";

export class ContactController {
  constructor(
    private createContactRequest:       CreateContactRequest,
    private listContactRequests:        ListContactRequests,
    private updateContactRequestStatus: UpdateContactRequestStatus,
  ) {}

  handleCreate = async (req: Request, res: Response): Promise<void> => {
    const { phone, email, message } = req.body as Record<string, unknown>;
    try {
      const contact = await this.createContactRequest.execute({
        phone:   typeof phone   === "string" ? phone.trim()   : "",
        email:   typeof email   === "string" ? email.trim()   : "",
        message: typeof message === "string" ? message.trim() : "",
      });
      res.status(201).json(contact);
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_FIELDS") {
        res.status(400).json({ message: "Todos los campos son requeridos" }); return;
      }
      throw err;
    }
  };

  handleList = async (_req: Request, res: Response): Promise<void> => {
    const contacts = await this.listContactRequests.execute();
    res.json(contacts);
  };

  handleUpdateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body as Record<string, unknown>;
    try {
      const contact = await this.updateContactRequestStatus.execute(
        id,
        status as ContactRequestStatus,
      );
      res.json(contact);
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_STATUS") {
        res.status(400).json({ message: "Estado inválido" }); return;
      }
      throw err;
    }
  };
}
